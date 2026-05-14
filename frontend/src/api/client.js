import axios from 'axios'

const client = axios.create({
  baseURL: '/api',
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_API_TOKEN || 'dev-token'}`,
    'Content-Type': 'application/json',
  },
})

export default client
