import { Router, Response } from 'express';
import multer from 'multer';
import { pool } from '../db';
import { requireAuth, AuthRequest } from '../middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Maps a DB row to the frontend Document shape
function rowToDocument(row: Record<string, unknown>) {
  const formatDate = (val: unknown) =>
    val instanceof Date ? val.toISOString().split('T')[0] : (val as string) || '';
  const formatTime = (val: unknown) =>
    typeof val === 'string' ? val.slice(0, 5) : '';

  const base = {
    id: row.id,
    category: row.category,
    fileUrl: row.file_url || undefined,
    fileName: row.file_name || undefined,
    fileMimeType: row.file_mime_type || undefined,
    tags: row.tags || [],
    history: row.history || [],
    createdAt: row.created_at instanceof Date ? (row.created_at as Date).toISOString() : row.created_at,
  };

  if (row.category === 'Issuance') {
    return {
      ...base,
      controlNumberSequence: row.control_number_sequence || '',
      releaseDate: formatDate(row.release_date),
      releaseTime: formatTime(row.release_time),
      dateOfDocument: formatDate(row.date_of_document),
      headingAddressee: row.heading_addressee || '',
      subject: row.subject || '',
      signatory: row.signatory || '',
      remarks: row.remarks || '',
    };
  }

  const shared = {
    ...base,
    grdsCode: row.grds_code || '',
    internalCode: row.internal_code || '',
    documentNo: row.document_no || '',
    dateReleased: formatDate(row.date_released),
    timeReleased: formatTime(row.time_released),
    typeOfDocument: row.type_of_document || '',
    dateOfDocument: formatDate(row.date_of_document),
    details: row.details || '',
    remarks: row.remarks || '',
    sender: row.sender || '',
    receiver: row.receiver || '',
    copyFurnished: row.copy_furnished || '',
    receivedBy: row.received_by || '',
    dateDelivered: formatDate(row.date_delivered),
    timeDelivered: formatTime(row.time_delivered),
  };

  if (row.category === 'Received') {
    return { ...shared, senderOffice: row.sender_office || '' };
  }
  return shared;
}

// Converts a frontend Document shape to DB column params
function docToParams(doc: Record<string, unknown>, userId: string) {
  const nullIfEmpty = (v: unknown) => (v === '' || v === undefined ? null : v);

  const base: Record<string, unknown> = {
    category: doc.category,
    user_id: userId,
    file_name: nullIfEmpty(doc.fileName),
    file_mime_type: nullIfEmpty(doc.fileMimeType),
    file_url: nullIfEmpty(doc.fileUrl),
    tags: JSON.stringify(doc.tags ?? []),
    history: JSON.stringify(doc.history ?? []),
    created_at: doc.createdAt || new Date().toISOString(),
  };

  if (doc.category === 'Issuance') {
    return {
      ...base,
      control_number_sequence: nullIfEmpty(doc.controlNumberSequence),
      release_date: nullIfEmpty(doc.releaseDate),
      release_time: nullIfEmpty(doc.releaseTime),
      date_of_document: nullIfEmpty(doc.dateOfDocument),
      heading_addressee: nullIfEmpty(doc.headingAddressee),
      subject: nullIfEmpty(doc.subject),
      signatory: nullIfEmpty(doc.signatory),
      remarks: nullIfEmpty(doc.remarks),
    };
  }

  const shared = {
    ...base,
    grds_code: nullIfEmpty(doc.grdsCode),
    internal_code: nullIfEmpty(doc.internalCode),
    document_no: nullIfEmpty(doc.documentNo),
    date_released: nullIfEmpty(doc.dateReleased),
    time_released: nullIfEmpty(doc.timeReleased),
    type_of_document: nullIfEmpty(doc.typeOfDocument),
    date_of_document: nullIfEmpty(doc.dateOfDocument),
    details: nullIfEmpty(doc.details),
    remarks: nullIfEmpty(doc.remarks),
    sender: nullIfEmpty(doc.sender),
    receiver: nullIfEmpty(doc.receiver),
    copy_furnished: nullIfEmpty(doc.copyFurnished),
    received_by: nullIfEmpty(doc.receivedBy),
    date_delivered: nullIfEmpty(doc.dateDelivered),
    time_delivered: nullIfEmpty(doc.timeDelivered),
  };

  if (doc.category === 'Received') {
    return { ...shared, sender_office: nullIfEmpty(doc.senderOffice) };
  }
  return shared;
}

// GET /api/documents?category=Issuance
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { category } = req.query;
    const params: unknown[] = [req.user!.userId];
    let query = 'SELECT * FROM documents WHERE user_id = $1';
    if (category && category !== 'All') {
      query += ' AND category = $2';
      params.push(category);
    }
    query += ' ORDER BY created_at DESC';
    const { rows } = await pool.query(query, params);
    res.json(rows.map(rowToDocument));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// GET /api/documents/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(rowToDocument(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// POST /api/documents
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const params = docToParams(req.body, req.user!.userId);
    const keys = Object.keys(params);
    const values = Object.values(params);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO documents (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    res.status(201).json(rowToDocument(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// PUT /api/documents/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const params = docToParams(req.body, req.user!.userId);
    const keys = Object.keys(params);
    const values = Object.values(params);
    const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows } = await pool.query(
      `UPDATE documents SET ${setClauses} WHERE id = $${keys.length + 1} AND user_id = $${keys.length + 2} RETURNING *`,
      [...values, req.params.id, req.user!.userId]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(rowToDocument(rows[0]));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// DELETE /api/documents/:id
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    if (!rowCount) { res.status(404).json({ error: 'Not found' }); return; }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// POST /api/documents/bulk-delete  { ids: string[] }
router.post('/bulk-delete', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { ids } = req.body as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) { res.status(400).json({ error: 'ids required' }); return; }
    await pool.query(
      `DELETE FROM documents WHERE id = ANY($1::uuid[]) AND user_id = $2`,
      [ids, req.user!.userId]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete documents' });
  }
});

// POST /api/documents/bulk-tag  { ids: string[], tag: { label, color } }
router.post('/bulk-tag', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { ids, tag } = req.body as { ids: string[]; tag: { label: string; color: string } };
    if (!Array.isArray(ids) || !tag) { res.status(400).json({ error: 'ids and tag required' }); return; }
    await pool.query(
      `UPDATE documents
       SET tags = CASE
         WHEN NOT (tags @> $1::jsonb) THEN tags || $1::jsonb
         ELSE tags
       END
       WHERE id = ANY($2::uuid[]) AND user_id = $3`,
      [JSON.stringify([tag]), ids, req.user!.userId]
    );
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

// POST /api/documents/:id/file  (multipart upload)
router.post('/:id/file', requireAuth, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) { res.status(400).json({ error: 'No file provided' }); return; }
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    const fileUrl = `${apiUrl}/api/documents/${req.params.id}/file`;
    await pool.query(
      `UPDATE documents SET file_data = $1, file_name = $2, file_mime_type = $3, file_url = $4
       WHERE id = $5 AND user_id = $6`,
      [req.file.buffer, req.file.originalname, req.file.mimetype, fileUrl, req.params.id, req.user!.userId]
    );
    res.json({ fileUrl, fileName: req.file.originalname, fileMimeType: req.file.mimetype });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/documents/:id/file  (download)
router.get('/:id/file', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { rows } = await pool.query(
      'SELECT file_data, file_name, file_mime_type FROM documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user!.userId]
    );
    if (!rows[0]?.file_data) { res.status(404).json({ error: 'File not found' }); return; }
    res.setHeader('Content-Type', rows[0].file_mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${rows[0].file_name}"`);
    res.send(rows[0].file_data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch file' });
  }
});

export default router;
