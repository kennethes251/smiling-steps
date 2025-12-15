module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    clientId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    psychologistId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    sessionType: {
      type: DataTypes.ENUM('Individual', 'Couples', 'Family', 'Group'),
      allowNull: false
    },
    sessionDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        'Pending Approval',      // Waiting for therapist
        'Approved',              // Therapist approved, waiting for payment
        'Payment Submitted',     // Client submitted payment proof
        'Confirmed',             // Payment verified, session confirmed
        'In Progress',           // Session is happening
        'Completed',             // Session finished
        'Cancelled',             // Cancelled by either party
        'Declined'               // Therapist declined
      ),
      defaultValue: 'Pending Approval'
    },
    meetingLink: {
      type: DataTypes.STRING
    },
    sessionNotes: {
      type: DataTypes.TEXT
    },
    sessionProof: {
      type: DataTypes.STRING
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sessionRate: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    isVideoCall: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    videoCallStarted: {
      type: DataTypes.DATE
    },
    videoCallEnded: {
      type: DataTypes.DATE
    },
    duration: {
      type: DataTypes.INTEGER // in minutes
    },
    
    // Payment tracking
    paymentStatus: {
      type: DataTypes.ENUM('Pending', 'Processing', 'Paid', 'Confirmed', 'Failed', 'Submitted', 'Verified', 'Refunded'),
      defaultValue: 'Pending'
    },
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: 'mpesa'
    },
    paymentProof: {
      type: DataTypes.JSONB,
      defaultValue: {}
      // Contains: transactionCode, screenshot, submittedAt
    },
    paymentInitiatedAt: {
      type: DataTypes.DATE
    },
    paymentVerifiedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    paymentVerifiedAt: {
      type: DataTypes.DATE
    },
    paymentInstructions: {
      type: DataTypes.TEXT
    },
    
    // M-Pesa payment fields
    mpesaCheckoutRequestID: {
      type: DataTypes.STRING
    },
    mpesaMerchantRequestID: {
      type: DataTypes.STRING
    },
    mpesaTransactionID: {
      type: DataTypes.STRING
    },
    mpesaAmount: {
      type: DataTypes.DECIMAL(10, 2)
    },
    mpesaPhoneNumber: {
      type: DataTypes.STRING
    },
    mpesaResultCode: {
      type: DataTypes.INTEGER
    },
    mpesaResultDesc: {
      type: DataTypes.TEXT
    },
    
    // Payment audit trail
    paymentAttempts: {
      type: DataTypes.JSONB,
      defaultValue: []
      // Array of: { timestamp, phoneNumber, amount, checkoutRequestID, resultCode, resultDesc, status }
    },
    
    // Forms and agreements
    confidentialityAgreement: {
      type: DataTypes.JSONB,
      defaultValue: {}
      // Contains: agreed, agreedAt, signature, ipAddress
    },
    clientIntakeForm: {
      type: DataTypes.JSONB,
      defaultValue: {}
      // Contains: emergencyContact, medicalHistory, therapyGoals, etc.
    },
    
    // Approval tracking
    approvedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    approvedAt: {
      type: DataTypes.DATE
    },
    declineReason: {
      type: DataTypes.TEXT
    },
    cancellationReason: {
      type: DataTypes.TEXT
    },
    
    // Notifications
    notificationsSent: {
      type: DataTypes.JSONB,
      defaultValue: []
    }
  }, {
    timestamps: true,
    tableName: 'sessions',
    indexes: [
      {
        fields: ['clientId']
      },
      {
        fields: ['psychologistId']
      },
      {
        fields: ['sessionDate']
      },
      {
        fields: ['status']
      },
      // M-Pesa payment indexes
      {
        fields: ['mpesaCheckoutRequestID', 'paymentStatus'],
        name: 'idx_mpesa_checkout_payment_status'
      },
      {
        fields: ['clientId', 'paymentStatus', 'sessionDate'],
        name: 'idx_client_payment_date'
      },
      {
        fields: ['psychologistId', 'paymentStatus', 'sessionDate'],
        name: 'idx_psychologist_payment_date'
      },
      {
        fields: ['mpesaTransactionID'],
        unique: true,
        name: 'idx_mpesa_transaction_unique',
        where: {
          mpesaTransactionID: {
            [require('sequelize').Op.ne]: null
          }
        }
      }
    ]
  });

  return Session;
};