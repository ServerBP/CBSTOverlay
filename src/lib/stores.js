import { writable } from 'svelte/store';

// @ts-ignore
function createPersistedStore(key, startValue) {
    const storedValue = localStorage.getItem(key);
    const store = writable(storedValue ? JSON.parse(storedValue) : startValue);
    
    store.subscribe(value => {
        localStorage.setItem(key, JSON.stringify(value));
    });

    return store;
}

export const authTokenStore = createPersistedStore('authToken', "");