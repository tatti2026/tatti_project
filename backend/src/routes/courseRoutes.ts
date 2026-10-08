import { Router } from 'express';
import {
  getAllCourses,
  createCourse,
  updateCourse,
  deleteCourse
} from '../controllers/courseController.js';

const router = Router();

router.get('/', getAllCourses);
router.get('/active', (req, res) => {
  req.query.status = 'available';
  return getAllCourses(req, res);
});
router.post('/', createCourse);
router.put('/:id', updateCourse);
router.delete('/:id', deleteCourse);

export default router;
