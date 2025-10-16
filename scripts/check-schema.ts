#!/usr/bin/env bun

import { neon } from '@neondatabase/serverless'

const url = process.env.NEON_DATABASE_URL
if (!url) {
  throw new Error('NEON_DATABASE_URL is not set')
}
const sql = neon(url)

const result = await sql`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_name = 'costumes' AND column_name = 'id'
`

console.log('Costumes table ID column:', result)

const tableInfo = await sql`
  SELECT table_name, column_name, data_type
  FROM information_schema.columns 
  WHERE table_name = 'costumes'
  ORDER BY ordinal_position
`

console.log('Full costumes table schema:')
tableInfo.forEach(col => {
  console.log(`  ${col.column_name}: ${col.data_type}`)
})