#!/bin/bash

# M-Pesa Payment Integration - Production Deployment Script
# This script automates the deployment of M-Pesa payment integration to production

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_section() {
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo -e "${CYAN}$1${NC}"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
}

# Check if running in production environment
check_environment() {
    log_section "1. Checking Environment"
    
    if [ "$NODE_ENV" != "production" ]; then
        log_warning "NODE_ENV is not set to 'production'"
        read -p "Continue anyway? (yes/no): " confirm
        if [ "$confirm" != "yes" ]; then
            log_info "Deployment cancelled"
            exit 0
        fi
    else
        log_success "Environment: Production"
    fi
}

# Backup database
backup_database() {
    log_section "2. Backing Up Database"
    
    log_info "Creating database backup..."
    cd server
    node scripts/backup-production-database.js
    
    if [ $? -eq 0 ]; then
        log_success "Database backup completed"
    else
        log_error "Database backup failed"
        exit 1
    fi
    cd ..
}

# Run database migration
run_migration() {
    log_section "3. Running Database Migration"
    
    log_warning "This will modify the production database"
    read -p "Proceed with migration? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Migration skipped"
        return
    fi
    
    log_info "Running migration..."
    cd server
    node scripts/migrate-mpesa-fields.js
    
    if [ $? -eq 0 ]; then
        log_success "Migration completed"
        
        # Verify migration
        log_info "Verifying migration..."
        node scripts/verify-migration.js
        
        if [ $? -eq 0 ]; then
            log_success "Migration verified"
        else
            log_error "Migration verification failed"
            exit 1
        fi
    else
        log_error "Migration failed"
        exit 1
    fi
    cd ..
}

# Deploy backend
deploy_backend() {
    log_section "4. Deploying Backend"
    
    log_info "Installing dependencies..."
    cd server
    npm install --production
    
    if [ $? -eq 0 ]; then
        log_success "Dependencies installed"
    else
        log_error "Failed to install dependencies"
        exit 1
    fi
    
    log_info "Restarting server..."
    # Uncomment the appropriate command for your deployment platform
    
    # For PM2:
    # pm2 restart smiling-steps-api
    
    # For systemd:
    # sudo systemctl restart smiling-steps
    
    # For Render/Heroku (automatic on git push):
    log_info "Server will restart automatically on deployment"
    
    log_success "Backend deployment completed"
    cd ..
}

# Deploy frontend
deploy_frontend() {
    log_section "5. Deploying Frontend"
    
    log_info "Building frontend..."
    cd client
    npm install
    npm run build
    
    if [ $? -eq 0 ]; then
        log_success "Frontend built successfully"
    else
        log_error "Frontend build failed"
        exit 1
    fi
    
    log_info "Deploying frontend..."
    # Uncomment the appropriate command for your deployment platform
    
    # For Netlify:
    # netlify deploy --prod
    
    # For Render (automatic on git push):
    log_info "Frontend will deploy automatically"
    
    log_success "Frontend deployment completed"
    cd ..
}

# Verify deployment
verify_deployment() {
    log_section "6. Verifying Deployment"
    
    # Check if API_URL is set
    if [ -z "$API_URL" ]; then
        log_warning "API_URL not set, using default"
        API_URL="http://localhost:5000"
    fi
    
    log_info "Testing API health..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health" || echo "000")
    
    if [ "$response" = "200" ]; then
        log_success "API is healthy"
    else
        log_error "API health check failed (HTTP $response)"
        log_warning "Deployment may have issues"
    fi
    
    log_info "Testing M-Pesa health..."
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/mpesa/health" || echo "000")
    
    if [ "$response" = "200" ]; then
        log_success "M-Pesa integration is healthy"
    else
        log_warning "M-Pesa health check returned HTTP $response"
    fi
}

# Test payment flow
test_payment_flow() {
    log_section "7. Testing Payment Flow (Optional)"
    
    log_warning "⚠️  This will initiate a real payment transaction"
    log_warning "⚠️  Use a small test amount (e.g., 10 KES)"
    read -p "Run payment flow test? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log_info "Payment flow test skipped"
        return
    fi
    
    log_info "Please test payment flow manually:"
    log_info "1. Log in to the application"
    log_info "2. Create a test session"
    log_info "3. Initiate payment with a small amount"
    log_info "4. Complete payment on your phone"
    log_info "5. Verify payment status updates"
    log_info "6. Check notifications are sent"
    log_info "7. Review audit logs"
    
    read -p "Press Enter when testing is complete..."
}

# Monitor initial transactions
monitor_transactions() {
    log_section "8. Monitoring Initial Transactions"
    
    log_info "Monitoring server logs..."
    log_info "Watch for:"
    log_info "  - Payment initiations"
    log_info "  - Callback processing"
    log_info "  - Error messages"
    log_info "  - Performance issues"
    
    log_warning "Keep monitoring for at least 1 hour after deployment"
    log_info "Check logs with: tail -f /var/log/smiling-steps/app.log"
    log_info "Or use your logging service dashboard"
}

# Main deployment flow
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║   M-Pesa Payment Integration - Production Deployment      ║"
    echo "║   Smiling Steps Teletherapy Platform                      ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    log_warning "⚠️  PRODUCTION DEPLOYMENT - Proceed with caution!"
    log_warning "⚠️  Ensure you have reviewed the deployment checklist"
    echo ""
    
    read -p "Continue with deployment? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        log_info "Deployment cancelled"
        exit 0
    fi
    
    # Run deployment steps
    check_environment
    backup_database
    run_migration
    deploy_backend
    deploy_frontend
    verify_deployment
    test_payment_flow
    monitor_transactions
    
    # Summary
    log_section "Deployment Summary"
    log_success "Deployment completed successfully!"
    echo ""
    log_info "Next steps:"
    log_info "1. Monitor logs for errors"
    log_info "2. Check payment success rate"
    log_info "3. Verify reconciliation runs at 11 PM"
    log_info "4. Review customer feedback"
    log_info "5. Update documentation"
    echo ""
    log_warning "Keep monitoring the system for the next 24-48 hours"
    echo ""
}

# Run main function
main
