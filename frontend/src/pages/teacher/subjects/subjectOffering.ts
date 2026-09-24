export interface SubjectOffering {
  id: number;
  name: string;
  section: string;
  room_number: string;
  schedule: string;

  section_id?: number; // not returned by GET, but exists for POST input
  grade: string;

  students: number;
  nextClass: string;

  average: number | null;
  pendingTasks: number;

  teacher_id: number;
  teacher_name: string;
}

export default function SubjectOffering() {}

