import { Request, Response } from 'express';
import { pool } from './db';
import { RequestHandler } from 'express';

const identifyHandler: RequestHandler = async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    res.status(400).json({ error: 'Email or phoneNumber is required' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Find all contacts matching either email or phone
    const { rows: matched } = await client.query(
      `SELECT * FROM contact WHERE (email = $1 OR phoneNumber = $2) AND deletedAt IS NULL`,
      [email, phoneNumber]
    );

    if (matched.length === 0) {
      // No existing contact, create new primary
      const insert = await client.query(
        `INSERT INTO contact(email, phoneNumber, linkPrecedence, createdAt, updatedAt) 
         VALUES($1, $2, 'primary', NOW(), NOW()) RETURNING *`,
        [email || null, phoneNumber || null]
      );

      await client.query('COMMIT');
      res.json({
        contact: {
          primaryContactId: insert.rows[0].id,
          emails: [insert.rows[0].email].filter(Boolean),
          phoneNumbers: [insert.rows[0].phoneNumber].filter(Boolean),
          secondaryContactIds: [],
        },
      });
      return;
    }

    // Step 2: Find all related contacts (email/phone connected)
    const visited = new Set<number>();
    const queue = [...matched];
    const related: any[] = [];

    while (queue.length) {
      const current = queue.pop();
      if (!current || visited.has(current.id)) continue;
      visited.add(current.id);
      related.push(current);

      const { rows: connected } = await client.query(
        `SELECT * FROM contact WHERE (email = $1 OR phoneNumber = $2) AND deletedAt IS NULL`,
        [current.email, current.phoneNumber]
      );

      for (const contact of connected) {
        if (!visited.has(contact.id)) {
          queue.push(contact);
        }
      }
    }

    // Step 3: Determine the primary contact (oldest createdAt)
    const primary = related.reduce((p, c) => (p.createdAt < c.createdAt ? p : c));

    // Step 4: Ensure others are secondary
    for (const c of related) {
      if (c.id !== primary.id && (c.linkPrecedence !== 'secondary' || c.linkedId !== primary.id)) {
        await client.query(
          `UPDATE contact SET linkPrecedence='secondary', linkedId=$1, updatedAt=NOW() WHERE id=$2`,
          [primary.id, c.id]
        );
      }
    }

    // Step 5: Check if current input is new (not already in DB)
    const alreadyExists = related.some(
      (c) =>
        (!email || c.email === email) &&
        (!phoneNumber || c.phoneNumber === phoneNumber)
    );

    if (!alreadyExists) {
      await client.query(
        `INSERT INTO contact(email, phoneNumber, linkPrecedence, linkedId, createdAt, updatedAt)
         VALUES($1, $2, 'secondary', $3, NOW(), NOW())`,
        [email || null, phoneNumber || null, primary.id]
      );
    }

    // Step 6: Fetch final merged contact list
    const { rows: final } = await client.query(
      `SELECT * FROM contact WHERE id = $1 OR linkedId = $1 AND deletedAt IS NULL`,
      [primary.id]
    );

    const emails = [...new Set(final.map((c) => c.email).filter(Boolean))];
    const phoneNumbers = [...new Set(final.map((c) => c.phoneNumber).filter(Boolean))];
    const secondaryContactIds = final.filter((c) => c.id !== primary.id).map((c) => c.id);

    res.json({
      contact: {
        primaryContactId: primary.id,
        emails,
        phoneNumbers,
        secondaryContactIds,
      },
    });
    return;
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    client.release();
  }
};

export default identifyHandler;
