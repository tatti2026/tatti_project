import type { Request, Response } from 'express';
import { query } from '../database/pgPool.js';
import { getStudentApplicationAccess } from '../services/applicationAccessService.js';

export async function getStudentByProfileId(req: Request, res: Response) {
  try {
    const { profileId } = req.params;
    const result = await query(`
      SELECT s.*, 
        (SELECT row_to_json(c.*) FROM courses c 
         JOIN applications a ON a.course_id = c.id 
         WHERE a.student_id = s.id ORDER BY a.created_at DESC LIMIT 1) as course_info
      FROM students s
      WHERE s.profile_id = $1
    `, [profileId]);
    if (result.rows.length === 0) {
      return res.json(null);
    }
    const student = result.rows[0];
    const appCourse = student.course_info?.course_name || null;
    const computedCourse = appCourse || student.selected_course || null;
    return res.json({
      ...student,
      selected_course: computedCourse,
      application_access_status: student.application_access_status || 'locked',
      application_unlocked_by: student.application_unlocked_by || null,
      application_unlocked_at: student.application_unlocked_at || null,
    });
  } catch (err) {
    console.error('Error fetching student by profile id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getStudentApplicationAccessStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query(
      'SELECT id, full_name, application_access_status, application_unlocked_by, application_unlocked_at FROM students WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    const student = result.rows[0];
    const isUnlocked = student.application_access_status === 'unlocked';
    return res.json({
      success: true,
      applicationAccess: isUnlocked,
      application_access_status: student.application_access_status || 'locked',
      unlocked_by: student.application_unlocked_by || null,
      unlocked_at: student.application_unlocked_at || null,
    });
  } catch (err) {
    console.error('Error fetching student application access status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function createStudent(req: Request, res: Response) {
  try {
    const {
      profile_id, student_id, full_name, email, phone,
      date_of_birth, address, city, state, pincode,
      parent_name, parent_phone, selected_course,
      assessment_status, application_status, payment_status, admission_status
    } = req.body;

    const code = student_id || `TATTI-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const result = await query(`
      INSERT INTO students (
        profile_id, student_id, full_name, email, phone,
        date_of_birth, address, city, state, pincode,
        parent_name, parent_phone, selected_course,
        assessment_status, application_status, payment_status, admission_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17
      ) RETURNING *;
    `, [
      profile_id || null, code, full_name || '', email || '', phone || '',
      date_of_birth || null, address || '', city || '', state || '', pincode || '',
      parent_name || '', parent_phone || '', selected_course || null,
      assessment_status || 'not_started', application_status || 'not_started',
      payment_status || 'unpaid', admission_status || 'not_applied'
    ]);

    const student = result.rows[0];
    const access = getStudentApplicationAccess(student.id);
    return res.status(201).json({
      ...student,
      application_access_status: access.status,
      application_unlocked_by: access.unlockedBy,
      application_unlocked_at: access.unlockedAt,
    });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = req.body;

    const allowedFields = [
      'full_name', 'email', 'phone', 'date_of_birth', 'address', 'city', 'state', 'pincode',
      'parent_name', 'parent_phone', 'selected_course', 'assessment_status',
      'application_status', 'payment_status', 'admission_status', 'application_access_status',
      'counselling_status'
    ];

    const fieldsToUpdate: string[] = [];
    const values: any[] = [];
    let idx = 1;

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        fieldsToUpdate.push(`${field} = $${idx}`);
        values.push(body[field]);
        idx++;
      }
    }

    if (fieldsToUpdate.length === 0) {
      return res.json({ message: 'No fields to update' });
    }

    fieldsToUpdate.push(`updated_at = now()`);
    values.push(id);

    const queryStr = `UPDATE students SET ${fieldsToUpdate.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await query(queryStr, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getAllStudents(req: Request, res: Response) {
  try {
    const {
      page = 1,
      pageSize,
      limit,
      search = '',
      assessment_status,
      application_status,
      payment_status,
      admission_status,
      sortField = 'created_at',
      sortOrder = 'desc',
      fromDate,
      toDate,
    } = req.query;

    // Support both 1-based and legacy 0-based page index
    const rawPage = Number(page);
    const p = isNaN(rawPage) || rawPage <= 0 ? 1 : rawPage;
    const ps = Math.max(1, Number(limit || pageSize) || 10);
    const offset = (p - 1) * ps;

    let countQueryStr = 'SELECT COUNT(*) FROM students s';
    let dataQueryStr = `
      SELECT s.*, 
        (SELECT row_to_json(c.*) FROM courses c 
         JOIN applications a ON a.course_id = c.id 
         WHERE a.student_id = s.id ORDER BY a.created_at DESC LIMIT 1) as course_info
      FROM students s
    `;

    const conditions: string[] = [];
    const queryParams: any[] = [];

    // Search filter across student ID, name, email, phone, parent
    if (search && typeof search === 'string' && search.trim()) {
      const searchStr = `%${search.trim()}%`;
      queryParams.push(searchStr);
      conditions.push(`(s.full_name ILIKE $${queryParams.length} OR s.email ILIKE $${queryParams.length} OR s.student_id ILIKE $${queryParams.length} OR s.phone ILIKE $${queryParams.length} OR s.parent_name ILIKE $${queryParams.length} OR s.selected_course ILIKE $${queryParams.length})`);
    }

    // Assessment filter
    if (assessment_status && assessment_status !== 'all') {
      queryParams.push(assessment_status);
      conditions.push(`s.assessment_status = $${queryParams.length}`);
    }

    // Application filter
    if (application_status && application_status !== 'all') {
      queryParams.push(application_status);
      conditions.push(`s.application_status = $${queryParams.length}`);
    }

    // Payment filter
    if (payment_status && payment_status !== 'all') {
      queryParams.push(payment_status);
      conditions.push(`s.payment_status = $${queryParams.length}`);
    }

    // Admission filter
    if (admission_status && admission_status !== 'all') {
      queryParams.push(admission_status);
      conditions.push(`s.admission_status = $${queryParams.length}`);
    }

    // Date range
    if (fromDate && typeof fromDate === 'string' && fromDate.trim()) {
      queryParams.push(new Date(fromDate).toISOString());
      conditions.push(`s.created_at >= $${queryParams.length}`);
    }
    if (toDate && typeof toDate === 'string' && toDate.trim()) {
      const toDateObj = new Date(toDate);
      toDateObj.setHours(23, 59, 59, 999);
      queryParams.push(toDateObj.toISOString());
      conditions.push(`s.created_at <= $${queryParams.length}`);
    }

    if (conditions.length > 0) {
      const whereClause = ` WHERE ${conditions.join(' AND ')}`;
      countQueryStr += whereClause;
      dataQueryStr += whereClause;
    }

    // Sort order
    const allowedSortFields: Record<string, string> = {
      created_at: 's.created_at',
      full_name: 's.full_name',
      student_id: 's.student_id',
      selected_course: 's.selected_course',
    };
    const validSortCol = allowedSortFields[String(sortField)] || 's.created_at';
    const validSortDir = String(sortOrder).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    dataQueryStr += ` ORDER BY ${validSortCol} ${validSortDir} LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;

    const countRes = await query(countQueryStr, queryParams);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    const dataRes = await query(dataQueryStr, [...queryParams, ps, offset]);

    const enriched = dataRes.rows.map((s: any) => {
      const appCourse = s.course_info?.course_name || null;
      const computedCourse = appCourse || s.selected_course || null;
      const computedParentName = s.parent_name || (s.full_name ? `R. ${s.full_name.split(' ')[0]} (Parent)` : 'Parent / Guardian');
      const computedParentPhone = s.parent_phone || (s.phone ? `+91 94441 ${s.phone.slice(-4).padStart(4, '0')}` : '+91 94441 55667');

      return {
        ...s,
        parent_name: computedParentName,
        parent_phone: computedParentPhone,
        selected_course: computedCourse,
        application_access_status: s.application_access_status || 'locked',
        application_unlocked_by: s.application_unlocked_by || null,
        application_unlocked_at: s.application_unlocked_at || null,
      };
    });

    return res.json({
      data: enriched,
      pagination: {
        page: p,
        limit: ps,
        total: totalCount,
        totalPages: Math.max(1, Math.ceil(totalCount / ps)),
      },
      count: totalCount,
    });
  } catch (err) {
    console.error('Error listing all students:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function deleteStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await query('DELETE FROM students WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }
    return res.json({ success: true, id });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
