#!/bin/bash

# Cross-Platform Setup Script for Email PII Monitor
# Works on Linux, macOS, and Windows Subsystem for Linux (WSL)

set -e  # Exit on any error

echo "🚀 Setting up Email PII Monitor..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    print_status "Checking Node.js installation..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js found: $NODE_VERSION"
        
        # Check if version is 16 or higher
        NODE_MAJOR=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_MAJOR" -ge 16 ]; then
            print_success "Node.js version is compatible (>= 16)"
        else
            print_error "Node.js version $NODE_VERSION is too old. Please install Node.js 16 or higher."
            exit 1
        fi
    else
        print_error "Node.js is not installed. Please install Node.js 16 or higher."
        print_status "Visit: https://nodejs.org/"
        exit 1
    fi
}

# Check if npm is installed
check_npm() {
    print_status "Checking npm installation..."
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm found: $NPM_VERSION"
    else
        print_error "npm is not installed."
        exit 1
    fi
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    if npm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Generate training data
generate_data() {
    print_status "Generating training data..."
    
    # Default values
    TOTAL_SAMPLES=${1:-500}
    PII_RATIO=${2:-0.5}
    
    print_status "Generating $TOTAL_SAMPLES samples with $PII_RATIO PII ratio..."
    
    if node ml/generate_training_data.js $TOTAL_SAMPLES $PII_RATIO; then
        print_success "Training data generated successfully"
    else
        print_warning "Failed to generate training data, will use fallback data"
    fi
}

# Train the model
train_model() {
    print_status "Training ML model..."
    
    if node ml/train-model.js; then
        print_success "Model trained successfully"
    else
        print_warning "Model training failed, will use rule-based detection only"
    fi
}

# Run consistency test
run_tests() {
    print_status "Running consistency tests..."
    
    if node test-consistency.js; then
        print_success "All tests passed"
    else
        print_warning "Some tests failed, but setup can continue"
    fi
}

# Create sample credentials file
create_sample_credentials() {
    if [ ! -f "credentials.json" ]; then
        print_status "Creating sample credentials.json file..."
        cat > credentials.json << EOF
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost:3000"]
  }
}
EOF
        print_warning "Created sample credentials.json. Please update with your actual Gmail API credentials."
    else
        print_success "credentials.json already exists"
    fi
}

# Main setup function
main() {
    echo "=========================================="
    echo "  Email PII Monitor - Cross-Platform Setup"
    echo "=========================================="
    echo ""
    
    # Parse command line arguments
    TOTAL_SAMPLES=${1:-500}
    PII_RATIO=${2:-0.5}
    
    print_status "Setup parameters: $TOTAL_SAMPLES samples, $PII_RATIO PII ratio"
    echo ""
    
    # Run setup steps
    check_nodejs
    check_npm
    install_dependencies
    generate_data $TOTAL_SAMPLES $PII_RATIO
    train_model
    run_tests
    create_sample_credentials
    
    echo ""
    echo "=========================================="
    print_success "Setup completed successfully!"
    echo "=========================================="
    echo ""
    echo "Next steps:"
    echo "1. Update credentials.json with your Gmail API credentials"
    echo "2. Start the server: npm start"
    echo "3. Test the API: curl http://localhost:3000/api/health"
    echo ""
    echo "For Docker deployment:"
    echo "1. Build: npm run docker:build"
    echo "2. Run: npm run docker:run"
    echo "3. Or use Docker Compose: npm run docker:compose"
    echo ""
    print_success "Setup complete! 🎉"
}

# Run main function with all arguments
main "$@" 