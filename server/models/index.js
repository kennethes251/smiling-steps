const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Define all models
  const User = require('./User')(sequelize, DataTypes);
  const Session = require('./Session')(sequelize, DataTypes);
  const Assessment = require('./Assessment')(sequelize, DataTypes);
  const AssessmentResult = require('./AssessmentResult')(sequelize, DataTypes);
  const CheckIn = require('./CheckIn')(sequelize, DataTypes);
  const Conversation = require('./Conversation')(sequelize, DataTypes);
  const Message = require('./Message')(sequelize, DataTypes);
  const Feedback = require('./Feedback')(sequelize, DataTypes);
  const Company = require('./Company')(sequelize, DataTypes);
  const Blog = require('./Blog')(sequelize, DataTypes);
  const Resource = require('./Resource')(sequelize, DataTypes);

  // Define associations
  User.hasMany(Session, { foreignKey: 'clientId', as: 'clientSessions' });
  User.hasMany(Session, { foreignKey: 'psychologistId', as: 'psychologistSessions' });
  Session.belongsTo(User, { foreignKey: 'clientId', as: 'client' });
  Session.belongsTo(User, { foreignKey: 'psychologistId', as: 'psychologist' });

  User.hasMany(AssessmentResult, { foreignKey: 'userId' });
  AssessmentResult.belongsTo(User, { foreignKey: 'userId' });
  AssessmentResult.belongsTo(Assessment, { foreignKey: 'assessmentId' });

  User.hasMany(CheckIn, { foreignKey: 'userId' });
  CheckIn.belongsTo(User, { foreignKey: 'userId' });

  User.hasMany(Conversation, { foreignKey: 'user1Id', as: 'conversationsAsUser1' });
  User.hasMany(Conversation, { foreignKey: 'user2Id', as: 'conversationsAsUser2' });
  Conversation.belongsTo(User, { foreignKey: 'user1Id', as: 'user1' });
  Conversation.belongsTo(User, { foreignKey: 'user2Id', as: 'user2' });

  Conversation.hasMany(Message, { foreignKey: 'conversationId' });
  Message.belongsTo(Conversation, { foreignKey: 'conversationId' });
  Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });

  User.hasMany(Feedback, { foreignKey: 'userId' });
  Feedback.belongsTo(User, { foreignKey: 'userId' });

  // Blog associations
  User.hasMany(Blog, { foreignKey: 'authorId', as: 'blogs' });
  Blog.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

  // Resource associations
  User.hasMany(Resource, { foreignKey: 'createdBy', as: 'resources' });
  Resource.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

  console.log('✅ All Sequelize models loaded successfully');

  return {
    User,
    Session,
    Assessment,
    AssessmentResult,
    CheckIn,
    Conversation,
    Message,
    Feedback,
    Company,
    Blog,
    Resource,
    sequelize
  };
};