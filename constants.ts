
import { Tag } from './types';

export const PREDEFINED_TAGS: Tag[] = [
  { label: 'Urgent', color: 'bg-red-500' },
  { label: 'Confidential', color: 'bg-purple-500' },
  { label: 'Internal', color: 'bg-blue-500' },
  { label: 'External', color: 'bg-green-500' },
  { label: 'Report', color: 'bg-yellow-500' },
  { label: 'Memo', color: 'bg-indigo-500' },
  { label: 'Order', color: 'bg-pink-500' },
  { label: 'Budget', color: 'bg-teal-500' },
];

export const PREDEFINED_DOC_TYPES = [
  'Memorandum',
  'Office Order',
  'Financial Report',
  'Project Proposal',
  'Invoice',
  'Contract',
  'Letter of Intent',
];
