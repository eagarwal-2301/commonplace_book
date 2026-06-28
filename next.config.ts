import type { NextConfig } from 'next'

const config: NextConfig = {
  experimental: {},
  outputFileTracingIncludes: {
    '/api/sync': ['./prompts/**'],
  },
}

export default config
