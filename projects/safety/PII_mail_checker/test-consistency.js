#!/usr/bin/env node

/**
 * Consistency Test for PII Mail Checker
 * Verifies that all components work together properly
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Testing PII Mail Checker Consistency...\n');

// Test 1: Check if all required files exist
const requiredFiles = [
  'server.js',
  'package.json',
  'README.md',
  'ml/MLPIIDetector.js',
  'ml/train-model.js',
  'ml/generate_training_data.js'
];

console.log('📁 Checking required files...');
let allFilesExist = true;
requiredFiles.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Test 2: Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['start', 'dev', 'train', 'generate-data'];
requiredScripts.forEach(script => {
  const exists = packageJson.scripts && packageJson.scripts[script];
  console.log(`   ${exists ? '✅' : '❌'} npm run ${script}`);
  if (!exists) allFilesExist = false;
});

// Test 3: Check dependencies
console.log('\n🔧 Checking dependencies...');
const requiredDeps = [
  'express',
  'googleapis',
  '@tensorflow/tfjs-node',
  'natural',
  'compromise',
  'cors',
  'helmet',
  'rate-limiter-flexible'
];

requiredDeps.forEach(dep => {
  const exists = packageJson.dependencies && packageJson.dependencies[dep];
  console.log(`   ${exists ? '✅' : '❌'} ${dep}`);
  if (!exists) allFilesExist = false;
});

// Test 4: Check for unused dependencies
console.log('\n🧹 Checking for unused dependencies...');
const unusedDeps = ['node-nlp', 'redis', 'socket.io'];
unusedDeps.forEach(dep => {
  const exists = packageJson.dependencies && packageJson.dependencies[dep];
  if (exists) {
    console.log(`   ⚠️  ${dep} is in package.json but not used`);
  } else {
    console.log(`   ✅ ${dep} not in package.json (good)`);
  }
});

// Test 5: Check ML detector import
console.log('\n🤖 Checking ML detector integration...');
const serverContent = fs.readFileSync('server.js', 'utf8');
const hasMLImport = serverContent.includes("const MLPIIDetector = require('./ml/MLPIIDetector')");
const hasMLInit = serverContent.includes('emailMonitor.initialize()');
const hasMLEndpoints = serverContent.includes('/api/ml/');

console.log(`   ${hasMLImport ? '✅' : '❌'} ML detector imported`);
console.log(`   ${hasMLInit ? '✅' : '❌'} ML detector initialized`);
console.log(`   ${hasMLEndpoints ? '✅' : '❌'} ML endpoints present`);

// Test 6: Check training data generator
console.log('\n📊 Checking training data generator...');
const generatorContent = fs.readFileSync('ml/generate_training_data.js', 'utf8');
const hasConfigurableParams = generatorContent.includes('process.argv[2]') && generatorContent.includes('process.argv[3]');
const hasPiiTypes = generatorContent.includes('piiTypes');
const hasNonPiiTemplates = generatorContent.includes('nonPiiTemplates');

console.log(`   ${hasConfigurableParams ? '✅' : '❌'} Configurable parameters`);
console.log(`   ${hasPiiTypes ? '✅' : '❌'} PII types defined`);
console.log(`   ${hasNonPiiTemplates ? '✅' : '❌'} Non-PII templates defined`);

// Test 7: Check training script integration
console.log('\n🎯 Checking training script integration...');
const trainContent = fs.readFileSync('ml/train-model.js', 'utf8');
const hasLoadTrainingData = trainContent.includes('loadTrainingData');
const hasSyntheticData = trainContent.includes('synthetic_training_data.json');
const hasFallback = trainContent.includes('generateBasicTrainingData');

console.log(`   ${hasLoadTrainingData ? '✅' : '❌'} Load training data method`);
console.log(`   ${hasSyntheticData ? '✅' : '❌'} Synthetic data integration`);
console.log(`   ${hasFallback ? '✅' : '❌'} Fallback data generation`);

// Summary
console.log('\n📋 Summary:');
if (allFilesExist && hasMLImport && hasMLInit && hasMLEndpoints) {
  console.log('✅ All components are consistent and properly integrated!');
  console.log('\n🚀 Ready to use:');
  console.log('   1. npm install');
  console.log('   2. npm run generate-data 500 0.5');
  console.log('   3. npm run train');
  console.log('   4. npm start');
} else {
  console.log('❌ Some inconsistencies found. Please review the issues above.');
}

console.log('\n✨ Consistency test completed!'); 