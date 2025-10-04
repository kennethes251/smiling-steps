const User = require('./User');
const Session = require('./Session');
const Assessment = require('./Assessment');
const AssessmentResult = require('./AssessmentResult');
const CheckIn = require('./CheckIn');
const Conversation = require('./Conversation');
const Message = require('./Message');
const Feedback = require('./Feedback');
const Company = require('./Company');
const Blog = require('./Blog');
const Resource = require('./Resource');

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

module.exports = {
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
  Resource
};