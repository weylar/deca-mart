import Helper from '../middleware/utils/Helper';
import db from '../src/models';
import Sequelize from 'sequelize';
import jwt from 'jsonwebtoken';

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
}

class UserService {
  static async signUpUser(newUser) {
    const hashedpassword = Helper.hashPassword(newUser.password);
    newUser.password = hashedpassword;
    newUser.isOnline = true;

    const user = await db.User.create(newUser);

    const { id, email, firstName, lastName, state, city, phoneNumber, profileImgUrl, isAdmin } = user;
    const payLoad = { id, email, isAdmin };
    const token = Helper.getToken(payLoad);
    return {
      status: 'success',
      statusCode: 201,
      data: {
        id,
        email,
        firstName,
        lastName,
        state,
        city,
        phoneNumber,
        isAdmin,
        profileImageUrl: profileImgUrl,
        token,
      },
      message: 'You have successfully signed up on deca-mart',
    };
  }

  static async logInUser(userCredentials) {
    
    const { email, password } = userCredentials;
    const foundUser = await db.User.findOne({
      where: { email }
    });

    if (!foundUser) {
      return {
        status: 'error',
        statusCode: 401,
        message: 'This email is not registered on deca-mart'
      };
    }

    const hash = foundUser.password;
    const isDeleted = foundUser.isDeleted;
  

    if(isDeleted === true) {
      return {
        status: 'error',
        statusCode: 422,
        message: 'User not found'
      }
    }
    if (Helper.comparePassword(password, hash) === true) {
      const { id, firstName, lastName, isAdmin, profileImgUrl } = foundUser;
      const payLoad = { id, email, isAdmin };
      const token = Helper.getToken(payLoad);
      return {
        status: 'success',
        statusCode: 200,
        data: {
          userId: id,
          email,
          firstName,
          lastName,
          isAdmin,
          profileImgUrl,
          token
        },
        message: `Welcome, ${firstName} ${lastName}`
      };
    }
    return {
      status: 'error',
      statusCode: 401,
      data: {},
      message: 'Authentication failed, invalid login details'
    };
  }

  static async changePassword(req) {

    const foundUser = await db.User.findOne({ where: { id: req.userId } });
    const hash = foundUser.password;
    const { oldPassword, newPassword } = req.body;
    

    if (Helper.comparePassword(oldPassword, hash) === true) {
      if (oldPassword == newPassword) {
        return {
          status: 'error',
          statusCode: 422,
          message: 'You cannot use the same password as the old one'
        }
      }

      await db.User.update({password: newPassword}, { where: {id: req.userId}});

      return {
        status: 'success',
        statusCode: 200,
        message: 'Password successfully changed'
      };
    }

    return {
      status: 'error',
      statusCode: 401,
      message: 'Unable to change your password, check your password again'
    }
  }

  static async addUserDetails(req) {

    const getAuser = await db.User.findOne({ where: {email: req.userEmail} });

    if(!getAuser) {
      return {
        status: 'error',
        statusCode: 404,
        message: "This email is not registered here"
      }
    }

    await db.User.update(
      { firstName: req.body.firstName, lastName: req.body.lastName ,state: req.body.state, city: req.body.city, phoneNumber: req.body.phoneNumber, profileImgUrl: req.body.profileImgUrl },
      { where: { email: req.userEmail } }
    );
    return {
      statusCode: 202,
      status: 'success',
      message: 'User details added'
    };
  }

  static async updateOnlineStatus(req) {
    const getUser = await db.User.findOne({ where: {email : req.userEmail} });

    if(!getUser) {
      return {
        status: 'error',
        statusCode: 404,
        message: "This email is not registered here"
      }
    }

    if (!req.body.isOnline) {
      return {
        status: 'error',
        statusCode: 400,
        message: 'Kindly send an online status'
      }
    }
    const isOnline = req.body.isOnline;

    if (isOnline == 'true') {
      await db.User.update(
        { isOnline: isOnline },
        { where: { email: req.userEmail } }
      );
    } else if (isOnline == 'false') {
      await db.User.update(
        { lastSeen: new Date(), isOnline: isOnline },
        { where: { email: req.userEmail } }
      );
    }


    return {
      statusCode: 200,
      status: 'success',
      message: 'Online status successfully changed'
    };
  }

  static async getAnotherUser(req) {

    const foundUser = await db.User.findOne({ where: { id: req.params.id, isDeleted: false, isAdmin: false}});

    if(!foundUser) {
      return {
        status: 'error',
        statusCode: 404,
        message: "User not found on this platform"
      }
    }

    const { id, firstName, lastName, email, state, city, profileImgUrl, lastSeen, phoneNumber, createdAt, isOnline } = foundUser;

    return {
      status: 'success',
      statusCode: 200,
      data: { id, firstName, lastName, email, state, city, profileImgUrl, lastSeen, phoneNumber, createdAt, isOnline},
      message: 'User information retrieved successfully'
    }
  }

  static async getAnotherUserByEmail(req) {
    
    const foundUser = await db.User.findOne({ where: { email: req.params.email, isDeleted: false }});

    if(!foundUser) {
      return {
        status: 'error',
        statusCode: 404,
        message: "User not found on this platform"
      }
    }

    return {
      status: 'success',
      statusCode: 200,
      data: foundUser,
      message: 'User information retrieved successfully'
    }
  }

  static async getOwnUser(req) {
    const ownUser = await db.User.findOne({ where: { email: req.userEmail }});

    const { id, firstName, lastName, email, state, isAdmin, city, profileImgUrl, phoneNumber } = ownUser

    return {
      status: 'success',
      statusCode: 200,
      data: { id, firstName, lastName, email, state, isAdmin, city, profileImgUrl, phoneNumber },
      message: 'User information retrieved successfully'
    }
  }

  static async getAllUsers() {
    const allUsers = await db.User.findAll({ where: { isDeleted: false, isAdmin: false }}, { order: [ ['createdAt', 'DESC'] ]});

    return {
      status: 'success',
      statusCode: 200,
      data: allUsers,
      message: 'All users information retrieved successfully'
    }
  }

  static async getAllUsersByLimit(req) {
    const limit = req.params.limit;
    const allUsers = await db.User.findAll({ limit, where: { isDeleted: false, isAdmin: false } });

    return {
      status: 'success',
      statusCode: 200,
      data: allUsers,
      message: 'All users information retrieved successfully'
    }
  }

  static async paginateUsers(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    const allUsers = await db.User.findAll({ offset, limit, where: { isDeleted: false, isAdmin: false } });

    return {
      status: 'success',
      statusCode: 200,
      data: allUsers,
      message: 'All users information retrieved successfully'
    }
  }

  static async getUsersLikeSuggest(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    let name = req.params.name;
    name = name.capitalize()
    const Op = Sequelize.Op;
    const allUsers = await db.User.findAll({ offset, limit, where: { firstName: { [Op.startsWith]: `%${name}%` }, isDeleted: false, isAdmin: false } });

    return {
      status: 'success',
      statusCode: 200,
      data: allUsers,
      message: 'All users information retrieved successfully'
    }
  }

  static async userImage(req) {
    
    const getAuser = await db.User.findOne({ where: {email: req.userEmail} });

    if(!getAuser) {
      return {
        status: 'error',
        statusCode: 404,
        message: "This email is not registered here"
      }
    }

    await db.User.update(
      { profileImgUrl: req.body.profileImgUrl }, { where: { email: req.userEmail } }
    );

    return {
      statusCode: 202,
      status: 'success',
      message: 'Image successfully uploaded'
    };
  }

  static async deleteUser(req) {
    const getAuser = await db.User.findOne({ where: {email: req.userEmail} });
    if(!getAuser) {
      return {
        status: 'error',
        statusCode: 404,
        message: "This email is not registered here"
      }
    }

    await db.User.update(
      { isDeleted: true }, { where: { email: req.userEmail } }
    );

    return {
      statusCode: 200,
      status: 'success',
      message: 'Your account on Huss.ng has been successfully deleted'
    };
  }
}

export default UserService;