const qs = id => document.getElementById(id);
const listEl = qs('capsules');
const editModal = qs('editModal');
const searchModal = qs('searchModal');
let editingId = null;

function openModal(m){ m.style.display='flex'; }
function closeModal(m){ m.style.display='none'; }

async function refreshList(){
  const items = await api.getCapsules();
  listEl.innerHTML='';
  items.forEach(item=>{
    const div=document.createElement('div');
    div.textContent=item.title;
    div.onclick=()=>editCapsule(item);
    listEl.appendChild(div);
  });
}

function editCapsule(item){
  editingId = item? item.id : null;
  qs('modalTitle').textContent = item? 'Edit Capsule':'New Capsule';
  qs('capTitle').value = item? item.title:'';
  qs('capTags').value = item? item.tags.join(', '):'';
  qs('capPayload').value = item? JSON.stringify(item.payload, null,2):'';
  qs('capArchived').checked = item? item.archived:false;
  openModal(editModal);
}

qs('newBtn').onclick=()=>editCapsule(null);
qs('cancelEdit').onclick=()=>closeModal(editModal);
qs('saveCapsule').onclick=async ()=>{
  try {
    const data = {
      id: editingId,
      title: qs('capTitle').value,
      tags: qs('capTags').value.split(',').map(t=>t.trim()).filter(Boolean),
      payload: JSON.parse(qs('capPayload').value || '{}'),
      archived: qs('capArchived').checked
    };
    await api.saveCapsule(data);
    closeModal(editModal);
    refreshList();
  } catch (e) {
    alert('Invalid payload JSON');
  }
};

qs('searchBtn').onclick=()=>{ openModal(searchModal); qs('searchQuery').focus(); };
qs('closeSearch').onclick=()=>closeModal(searchModal);
qs('runSearch').onclick=runSearch;

async function runSearch(){
  const q = qs('searchQuery').value;
  const inc = qs('includeArchived').checked;
  const versions = qs('versionMode').value;
  const res = await api.searchCapsules(q, inc, versions);
  const container = qs('searchResults');
  container.innerHTML='';
  res.results.forEach(r=>{
    const div=document.createElement('div');
    div.textContent=`${r.title} (v${r.version})`;
    div.onclick=async ()=>{
      const data = await api.getCapsule(r.id);
      editCapsule(data);
      closeModal(searchModal);
    };
    container.appendChild(div);
  });
}

document.addEventListener('keydown', e=>{
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); editCapsule(null); }
  if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); openModal(searchModal); qs('searchQuery').focus(); }
  if (e.key === 'Escape') { closeModal(editModal); closeModal(searchModal); }
});

refreshList();
