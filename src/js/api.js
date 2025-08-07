async function getCapsules() {
  const res = await fetch('/api/capsules');
  return res.json();
}

async function saveCapsule(data) {
  const res = await fetch('/api/capsules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return res.json();
}

async function deleteCapsule(id) {
  const res = await fetch(`/api/capsules/${id}`, { method: 'DELETE' });
  return res.json();
}

async function getCapsule(id) {
  const res = await fetch(`/api/capsules/${id}`);
  return res.json();
}

async function searchCapsules(q, includeArchived, versions) {
  const params = new URLSearchParams({ q });
  if (includeArchived) params.append('includeArchived', 'true');
  if (versions) params.append('versions', versions);
  const res = await fetch(`/api/search?${params.toString()}`);
  return res.json();
}

window.api = { getCapsules, getCapsule, saveCapsule, deleteCapsule, searchCapsules };
