import { Router } from 'express';
import {
  getStudentByProfileId,
  createStudent,
  updateStudent,
  getAllStudents,
  deleteStudent
} from '../controllers/studentController.js';

const router = Router();

router.get('/profile/:profileId', getStudentByProfileId);
router.get('/', getAllStudents);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

export default router;
