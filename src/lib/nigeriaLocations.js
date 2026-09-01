const STATES_URL = 'https://api.openadmindata.org/api/v1/ng/state.json';
const stateUrl = (slug) => `https://api.openadmindata.org/api/v1/ng/state/${slug}.json`;

let statesPromise = null;
const cityPromises = new Map();

function displayStateName(name) {
  return name === 'Federal Capital Territory' ? 'FCT' : name;
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Location lookup failed (${response.status})`);
  }
  return response.json();
}

export function resetNigeriaLocationCache() {
  statesPromise = null;
  cityPromises.clear();
}

export async function getNigeriaStates() {
  if (!statesPromise) {
    statesPromise = fetchJson(STATES_URL)
      .then((payload) =>
        (payload.entities || []).map((entity) => ({
          name: displayStateName(entity.name_en),
          slug: entity.slug
        }))
      )
      .catch((error) => {
        statesPromise = null;
        throw error;
      });
  }
  return statesPromise;
}

export async function getNigeriaCities(stateSlug) {
  if (!stateSlug) return [];
  if (!cityPromises.has(stateSlug)) {
    const request = fetchJson(stateUrl(stateSlug))
      .then((payload) =>
        (payload.children?.entities || [])
          .map((entity) => entity.name_en)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      )
      .catch((error) => {
        cityPromises.delete(stateSlug);
        throw error;
      });
    cityPromises.set(stateSlug, request);
  }
  return cityPromises.get(stateSlug);
}
