const searchIndex = {
  async query(q, opts = {}) {
    const params = new URLSearchParams({ q, ...opts });
    const res = await fetch(`/api/search?${params.toString()}`);
    return await res.json();
  }
};

if (typeof window !== 'undefined') {
  window.searchIndex = searchIndex;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = searchIndex;
}
