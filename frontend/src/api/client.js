import axios from 'axios'

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN || 'dev-token'}`,
    'Content-Type': 'application/json',
  },
})

export default client
