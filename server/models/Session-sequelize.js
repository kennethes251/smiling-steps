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
      type: DataTypes.ENUM('Pending', 'Booked', 'In Progress', 'Completed', 'Cancelled'),
      defaultValue: 'Pending'
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
    paymentStatus: {
      type: DataTypes.ENUM('Pending', 'Paid', 'Refunded'),
      defaultValue: 'Pending'
    },
    paymentMethod: {
      type: DataTypes.STRING
    },
    cancellationReason: {
      type: DataTypes.TEXT
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
      }
    ]
  });

  return Session;
};