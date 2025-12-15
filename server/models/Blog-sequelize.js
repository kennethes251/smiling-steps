module.exports = (sequelize, DataTypes) => {
  const Blog = sequelize.define('Blog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 200]
      }
    },
    slug: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    excerpt: {
      type: DataTypes.STRING(500),
      validate: {
        len: [0, 500]
      }
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    category: {
      type: DataTypes.ENUM(
        'Mental Health',
        'Addiction Recovery',
        'Therapy Tips',
        'Self-Care',
        'Relationships',
        'Wellness',
        'Success Stories',
        'Research & Studies',
        'Recovery Guide',
        'Community Education',
        'Support Tool'
      ),
      allowNull: false
    },
    tags: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: []
    },
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    publishedAt: {
      type: DataTypes.DATE
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    featuredImage: {
      type: DataTypes.STRING
    },
    metaTitle: {
      type: DataTypes.STRING(60),
      validate: {
        len: [0, 60]
      }
    },
    metaDescription: {
      type: DataTypes.STRING(160),
      validate: {
        len: [0, 160]
      }
    },
    readTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    views: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    likes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  }, {
    timestamps: true,
    hooks: {
      beforeValidate: (blog) => {
        // Generate slug from title
        if (blog.title && (!blog.slug || blog.changed('title'))) {
          blog.slug = blog.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        }
        
        // Calculate read time (average 200 words per minute)
        if (blog.content && blog.changed('content')) {
          const wordCount = blog.content.split(/\s+/).length;
          blog.readTime = Math.ceil(wordCount / 200);
        }
        
        // Set published date if publishing for first time
        if (blog.changed('published') && blog.published && !blog.publishedAt) {
          blog.publishedAt = new Date();
        }
      }
    },
    indexes: [
      { fields: ['slug'], unique: true },
      { fields: ['category'] },
      { fields: ['published'] },
      { fields: ['publishedAt'] },
      { fields: ['authorId'] }
    ]
  });

  // Associations
  Blog.associate = (models) => {
    Blog.belongsTo(models.User, {
      foreignKey: 'authorId',
      as: 'author'
    });
  };

  return Blog;
};
