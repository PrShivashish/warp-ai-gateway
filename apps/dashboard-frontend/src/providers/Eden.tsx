import { treaty } from '@elysiajs/eden'
import type { App } from 'app'
import { createContext, useContext } from 'react';
import { PRIMARY_API_URL } from '../lib/env';


// Strip the protocol (http:// / https://) so Eden's treaty() works with both
// local http and production https behind Nginx.
const host = PRIMARY_API_URL.replace(/^https?:\/\//, '');

const client = treaty<App>(host, {
    fetch: {
        credentials: 'include'
    }
});


const ElysiaClientContext = createContext(client);

export const ElysiaClientContextProvider = ElysiaClientContext.Provider;
export const useElysiaClient = () => {
    const client = useContext(ElysiaClientContext);
    return client;
}