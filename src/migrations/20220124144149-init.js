'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    const { DataTypes } = Sequelize;

    await queryInterface.createTable('Campaigns', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      pitchId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      campaignType: {
        type: Sequelize.DataTypes.ENUM,
        values: ['havePitch', 'oneForAll', 'individual'],
        allowNull: true,
      },
      status: {
        type: Sequelize.DataTypes.ENUM,
        values: ['Completed', 'Active', 'Unfinished'],
        defaultValue: 'Unfinished',
        allowNull: true,
      },
      title: {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'Campaign title',
        allowNull: true,
      },
      campaignDescription: {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'Campaign description',
        allowNull: true,
      },
      sender: {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'Sender name',
        allowNull: true,
      },
      senderEmail: {
        type: Sequelize.DataTypes.STRING,
        defaultValue: 'Sender email',
        allowNull: true,
      },
      picture: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true,
      },
      step: {
        type: Sequelize.DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: true,
      },
      sheduleTime: {
        type: Sequelize.DataTypes.DATE,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DataTypes.DATE,
      },
    });

    await queryInterface.createTable('CampaignAccesses', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      campaignId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.DataTypes.ENUM,
        values: ['Admin', 'Moderator'],
        defaultValue: 'Moderator',
        allowNull: true,
      },
    });
    await queryInterface.createTable('ContactLists', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      description: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
    });

    await queryInterface.createTable('CampaignToContactLists', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      CampaignId: {
        type: Sequelize.DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'Campaigns',
            // schema: 'schema'
          },
          key: 'id',
        },
      },
      ContactListId: {
        type: Sequelize.DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'ContactLists',
            // schema: 'schema'
          },
          key: 'id',
        },
      },
    });

    await queryInterface.createTable('Contacts', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      avatar: {
        type: DataTypes.TEXT(3000),
        allowNull: true,
      },
      isPrivate: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      companyName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      companyType: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      jobRole: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      position: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      twitterUsername: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      phoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mobilePhoneNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      faxNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      workingLanguages: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      country: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      aboutContact: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      contactOwnSubjects: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      similarityIndex: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      countOfRecients: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    });

    await queryInterface.createTable('ContactListToContacts', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ContactListId: {
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'ContactLists',
            // schema: 'schema'
          },
          key: 'id',
        },
      },
      ContactId: {
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'Contacts',
          },
          key: 'id',
        },
      },
    });

    await queryInterface.createTable('ContactNotes', {
      id: {
        type: Sequelize.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      textContent: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    });

    await queryInterface.createTable('ContactStatuses', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
      },
    });

    await queryInterface.createTable('Subjects', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      subjectText: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    });

    await queryInterface.createTable('ContactToSubjects', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ContactId: {
        type: DataTypes.INTEGER,
      },
      SubjectId: {
        type: DataTypes.INTEGER,
        references: {
          model: {
            tableName: 'Subjects',
          },
          key: 'id',
        },
      },
      ownerId: {
        type: DataTypes.INTEGER,
      },
    });

    await queryInterface.createTable('Faqs', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      mediaType: {
        type: DataTypes.ENUM,
        values: ['youtube', 'picture'],
        allowNull: true,
      },
      mediaContent: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      textFilePath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    });

    await queryInterface.createTable('Files', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      fileType: {
        type: DataTypes.ENUM,
        values: ['audio', 'message', 'document', 'userAvatar', 'campaignImage', 'contactAvatar'],
        allowNull: false,
      },
      fileName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM,
        values: ['Completed', 'Draft', 'Failed'],
        allowNull: true,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      size: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      length: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      words: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      textTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      recognizedTextPath: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      recognizedTextPreview: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      key: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      fileSource: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      createdAt: {
        type: Sequelize.DataTypes.DATE,
      },
    });

    await queryInterface.createTable('IndividualPitches', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pitchId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contactId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    });

    await queryInterface.createTable('InvitationTokens', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

    });

    await queryInterface.createTable('MailingSessions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      contentId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      campaignId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });

    await queryInterface.createTable('MailingSessionResults', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      mailingSessionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      contactId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      successfulResult: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
      },
      error: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      errorMessage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      messageId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    });

    await queryInterface.createTable('Notifications', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      type: {
        type: DataTypes.ENUM,
        values: ['campaign', 'payment', 'update'],
        allowNull: false,
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      text: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      additionalData: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    });

    await queryInterface.createTable('Pitches', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      pitchTitle: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pitchTextPreview: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      pitchText: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      preliminaryStory: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      preliminaryStoryOriginalId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      keyStory: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      keyStoryOriginalId: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    });

    await queryInterface.createTable('Profiles', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      ownerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      countUsers: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      countSizes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      type: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
    });

    await queryInterface.createTable('ResetTokens', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      UserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });

    await queryInterface.createTable('Users', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      picture: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      subscriptionIsActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      customerId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      subscriptionId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      organization: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    });

    await queryInterface.createTable('UserTeamMembers', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      userInTeamId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        // references: {
        //   model: {
        //     tableName: "Users",
        //     key: 'id'
        //   }
        // }
      },
      status: {
        type: DataTypes.ENUM,
        values: ['Admin', 'Moderator', 'Invite Pending'],
        defaultValue: 'Invite Pending',
        allowNull: false,
      },
      hash: {
        type: DataTypes.STRING,
      },
    });
  },

  down: async (queryInterface, Sequelize) => {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    // await queryInterface.dropTable('Campaigns');
  },
};
