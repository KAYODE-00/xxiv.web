import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

const API_URL = process.env.NEXT_PUBLIC_YCODE_API_URL || 'https://api.ycode.com';

async function main() {
  console.log(`Fetching templates from ${API_URL}/api/templates...`);
  const listRes = await fetch(`${API_URL}/api/templates`);
  const listData = await listRes.json();
  
  if (!listData.templates || listData.templates.length === 0) {
    console.log('No templates found.');
    return;
  }
  
  const sampleId = listData.templates[0].id;
  console.log(`\nFetching details for template ${sampleId} (${listData.templates[0].name})...`);
  
  const detailRes = await fetch(`${API_URL}/api/templates/${sampleId}`);
  const detailData = await detailRes.json();
  
  console.log('\nTemplate details keys:', Object.keys(detailData.template));
  
  // also check what the apply route returns
  console.log(`\nFetching apply payload for template ${sampleId}...`);
  const applyRes = await fetch(`${API_URL}/api/templates/${sampleId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  const applyData = await applyRes.json();
  
  console.log('\nApply payload keys:', Object.keys(applyData));
  if (applyData.sql) {
    console.log('Sample SQL:', applyData.sql.insert.substring(0, 500) + '...');
  }
}

main().catch(console.error);
