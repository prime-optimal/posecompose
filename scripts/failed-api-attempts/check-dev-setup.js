#!/usr/bin/env node

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function checkCommand(command, description) {
  try {
    execSync(command, { stdio: 'pipe', timeout: 5000 })
    log(`✅ ${description}`, 'green')
    return true
  } catch (error) {
    log(`❌ ${description}`, 'red')
    return false
  }
}

function checkFile(path, description) {
  try {
    readFileSync(resolve(path))
    log(`✅ ${description}`, 'green')
    return true
  } catch (error) {
    log(`❌ ${description}`, 'red')
    return false
  }
}

function checkEnvVar(varName, description) {
  if (process.env[varName]) {
    log(`✅ ${description}`, 'green')
    return true
  } else {
    log(`❌ ${description}`, 'red')
    return false
  }
}

log('🔍 Development Setup Check', 'blue')
log('============================', 'blue')

// Load environment variables
try {
  const envContent = readFileSync('.env', 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim()
    }
  })
} catch (error) {
  log('⚠️  Could not load .env file', 'yellow')
}

const checks = [
  // Environment
  () => checkFile('.env', '.env file exists'),
  () => checkEnvVar('NEON_DATABASE_URL', 'NEON_DATABASE_URL configured'),
  
  // API Server
  () => checkCommand('curl -s http://localhost:4000/api/health', 'API server responding (port 4000)'),
  
  // Frontend
  () => checkCommand('curl -s http://localhost:8080', 'Frontend dev server responding (port 8080)'),
  () => checkCommand('curl -s http://localhost:8080/api/costumes', 'Frontend proxy to API working'),
  
  // Database
  () => checkCommand('curl -s http://localhost:4000/api/costumes | jq -e ".count > 0"', 'Database has costume data'),
]

let allPassed = true
checks.forEach(check => {
  const result = check()
  if (!result) allPassed = false
})

log('\n============================', 'blue')
if (allPassed) {
  log('🎉 All checks passed! Development environment is ready.', 'green')
} else {
  log('⚠️  Some checks failed. Please fix the issues above.', 'yellow')
  log('\n💡 Quick fixes:', 'yellow')
  log('   • Start API server: bun run serve:api', 'yellow')
  log('   • Start frontend: bun run dev', 'yellow')
  log('   • Check .env file for NEON_DATABASE_URL', 'yellow')
}

process.exit(allPassed ? 0 : 1)