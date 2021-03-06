import db from '../src/models';
import Sequelize from 'sequelize';

String.prototype.capitalize = function() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

class AdService {
  static async createAd(req) {
    const categoryName = req.params.categoryName.capitalize();
    const subCategoryName = req.params.subCategoryName.capitalize();

    const category = await db.Category.findOne({ where: { name: categoryName } });
    const subCategory = await db.SubCategory.findOne({ where: { name: subCategoryName } });

    if (!category) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'No category with such parameter'
      };
    }

    if (!subCategory) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'No sub category with such parameter'
      };
    }

    req.body.categoryName = categoryName;
    req.body.subCategoryName = subCategoryName;
    req.body.userId = req.userId;
    req.body.modifiedStatusDate = new Date();

    if (req.body.type === 'Top') {
      req.body.payDate = new Date();
    } else {
      req.body.payDate = null;
    }

    const ad = await db.Product.create(req.body);
    if (ad.type === 'free') {
      ad.expireAd()
    }
    await db.Category.update(
      { belongedAd: category.belongedAd + 1 },
      { where: { name: categoryName } }
    );

    return {
      status: 'success',
      statusCode: 200,
      data: ad,
      message: 'A new ad has been added'
    };
  }

  static async getAd(req) {
    const oldAd = await db.Product.findOne({
      where: { id: req.params.adId, status: 'active' },
      attributes: { exclude: 'name' }
    });

    if (!oldAd) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'Such ad does not exist'
      };
    }

    let title = oldAd.title
    title = title.capitalize();
    let category = oldAd.categoryName;
    category = category.capitalize();
    const Op = Sequelize.Op;
    const result = await db.Product.findAll({
      where: { title:  { [Op.iLike]: `%${title}%` }, categoryName: category },
      attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if(req.userId === null) {
      return {
        status: 'success',
        statusCode: 200,
        data: oldAd,
        message: 'Ad sucessfully retrieved'
      }
    }

    let res = result.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let similarAds = result.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        } else {
          element.dataValues['isFavorite'] = false;
        }
      });
      return element;
    });

    let index = similarAds.findIndex(elem => elem.dataValues.id === oldAd.id);
    similarAds.splice(index, 1);

    if (oldAd.userId != req.userId) {
      await db.Product.update(
        { count: oldAd.count + 1 },
        { where: { id: req.params.adId } }
      );
    }

      const foundAd = await db.Product.findOne({ where: {id: oldAd.id}, attributes: { exclude: 'name' }});
      const adImages = await db.Image.findAll({ where: {productId: oldAd.id } });
      const favorites = await db.Favorite.findAll({ where: { productId: oldAd.id, userId: req.userId }});
      let isFavorite;
      if (favorites.length > 0) {
        isFavorite = true;
      } else {
        isFavorite = false;
      }
      
    return {
      status: 'success',
      statusCode: 200,
      data: {
        id: foundAd.id,
        userId: foundAd.userId,
        description: foundAd.description,
        categoryName: foundAd.categoryName,
        subCategoryName: foundAd.subCategoryName,
        title: foundAd.title,
        price: foundAd.price,
        type: foundAd.type,
        status: foundAd.status,
        isNegotiable: foundAd.isNegotiable,
        count: foundAd.count,
        location: foundAd.location,
        createdAt: foundAd.createdAt,
        adImages,
        similarAds,
        isFavorite
      },
      message: 'Ad sucessfully retrieved'
    };
  }

  static async getOwnAd(req) {
    const foundAd = await db.Product.findOne({
      where: { userId: req.userId, id: req.params.adId, status: 'active' },
      attributes: { exclude: 'name' }
    });

    const adImages = await db.Image.findAll({ where: {productId: req.params.adId } });

    const favorites = await db.Favorite.findAll({ where: { productId: req.params.adId, userId: req.userId }});
    let isFavorite;
      if (favorites.length > 0) {
        isFavorite = true;
      } else {
        isFavorite = false;
      }

    if (foundAd) {
      return {
        status: 'success',
        statusCode: 200,
        data: {
          id: foundAd.id,
          userId: foundAd.userId,
          description: foundAd.description,
          categoryName: foundAd.categoryName,
          subCategoryName: foundAd.subCategoryName,
          title: foundAd.title,
          price: foundAd.price,
          type: foundAd.type,
          status: foundAd.status,
          isNegotiable: foundAd.isNegotiable,
          count: foundAd.count,
          location: foundAd.location,
          createdAt: foundAd.createdAt,
          adImages,
          isFavorite
        },
        message: 'Ad sucessfully retrieved'
      };
    }

    return {
      status: 'error',
      statusCode: 404,
      message: 'Such ad does not exist for you'
    };
  }

  static async getAllAds(req) {
    
    let allAds = await db.Product.findAll({ where: {status: 'active'},
      order: [['id', 'DESC']], attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (req.userId === null) {
      return {
        status: 'success',
        statusCode: 200,
        data: allAds,
        message: 'All ads have been retrieved successfully'
      }
    }

    let res = allAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    });

    let newResponse = await Promise.all(res);

    let result = allAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        } else {
          element.dataValues['isFavorite'] = false;
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All ads have been retrieved successfully'
    };
  }

  static async getAllUserAds(req) {
    let allUserAds = await db.Product.findAll({ where: {status: 'active', userId: req.params.userId},
      order: [['id', 'DESC']], attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (req.userId === null) {
      return {
        status: 'success',
        statusCode: 200,
        data: allUserAds,
        message: 'All ads have been retrieved successfully'
      }
    }

    let res = allUserAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    });

    let newResponse = await Promise.all(res);

    let result = allUserAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        } else {
          element.dataValues['isFavorite'] = false;
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All ads have been retrieved successfully'
    };
  }

  static async getAllAdsByLimit(req) {
    const allAds = await db.Product.findAll({
      where: {status: 'active'},
      limit: 10,
      order: [['id', 'DESC']],
      attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (req.userId === null) {
      return {
        status: 'success',
        statusCode: 200,
        data: allAds,
        message: 'All ads have been retrieved successfully'
      }
    }

    let res = allAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        } else {
          element.dataValues['isFavorite'] = false;
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All ads have been retrieved successfully'
    };
  }

  static async paginateAds(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    const allAds = await db.Product.findAll({
      offset,
      limit,
      where: {status: 'active'},
      order: [['id', 'DESC']],
      attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    let res = allAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allOwnAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All ads have been retrieved successfully'
    };
  }

  static async getAdsSuggest(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    let title = req.params.title;
    title = title.capitalize();
    const Op = Sequelize.Op;
    const allAds = await db.Product.findAll({
      offset,
      limit,
      where: { title: { [Op.startsWith]: `%${title}%` }, status: 'active' },
      attributes: { exclude: 'name' }, attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    let res = allAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allOwnAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All ads have been retrieved successfully'
    };
  }

  static async getAdsByStatus(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    const allAds = await db.Product.findAll({
      offset,
      limit,
      where: { status: req.params.status },
      order: [['id', 'DESC']],
      attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });
    let res = allAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allOwnAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All ads have been retrieved successfully'
    };
  }

  static async getAdsByStatusSuggest(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    let title = req.params.title;
    title = title.capitalize();
    const Op = Sequelize.Op;
    const allAds = await db.Product.findAll({
      offset,
      limit,
      where: { status: req.params.status, title: { [Op.iLike]: `%${title}%` } },
      attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });
    let res = allAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allOwnAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All ads have been retrieved successfully'
    };
  }

  static async getAllOwnAds(req) {
    const allOwnAds = await db.Product.findAll({
      where: { userId: req.userId, status: 'active' },
      order: [['id', 'DESC']],
      attributes: { exclude: 'name' }, attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (allOwnAds.length === 0) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'You do not have any ads'
      };
    }

    return {
      status: 'success',
      statusCode: 200,
      data: allOwnAds,
      message: 'All your ads have been successfully retrieved'
    };
  }

  static async getAllOwnAdsByLimit(req) {
    const allOwnAds = await db.Product.findAll({
      where: { userId: req.userId, status: 'active' },
      limit: req.params.limit,
      order: [['id', 'DESC']],
      attributes: { exclude: 'name' }, attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (allOwnAds.length === 0) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'You do not have any ads'
      };
    }

    let res = allOwnAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allOwnAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All your ads have been successfully retrieved'
    };
  }

  static async paginateOwnAds(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    const allOwnAds = await db.Product.findAll({
      where: { userId: req.userId, status: 'active' },
      offset,
      limit,
      order: [['id', 'DESC']],
      attributes: { exclude: 'name' }, attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (allOwnAds.length === 0) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'You do not have any ads'
      };
    }

    let res = allOwnAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allOwnAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All your ads have been successfully retrieved'
    };
  }

  static async getOwnAdsSuggest(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    let title = req.params.title;
    title = title.capitalize();
    const Op = Sequelize.Op;
    const allOwnAds = await db.Product.findAll({
      offset,
      limit,
      where: { userId: req.userId, title: { [Op.startsWith]: `%${title}%` }, status: 'active' },
      attributes: { exclude: 'name' }, attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (allOwnAds.length === 0) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'You do not have any ads'
      };
    }

    let res = allOwnAds.map(elem => {
      return db.Favorite.findOne({ where: {userId: req.userId, productId: elem.dataValues.id}});
      
    })

    let newResponse = await Promise.all(res);

    let result = allOwnAds.map(element => {
      newResponse.forEach(item => {
        if (item !== null) {
          element.dataValues['isFavorite'] = (element.dataValues.id == item.dataValues.productId) && (item.dataValues.userId == req.userId);
        }
      });
      return element;
    });

    return {
      status: 'success',
      statusCode: 200,
      data: result,
      message: 'All your ads have been successfully retrieved'
    };
  }

  static async getOwnAdsByStatus(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    const allAds = await db.Product.findAll({
      offset,
      limit,
      where: { userId: req.userId, status: req.params.status },
      order: [['id', 'DESC']],attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (allAds) {
      return {
        status: 'success',
        statusCode: 200,
        data: allAds,
        message: 'All ads retrieved successfully'
      };
    }
  }

  static async getOwnAdsByStatusSuggest(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    let title = req.params.title;
    title = title.capitalize();
    const Op = Sequelize.Op;
    const allAds = await db.Product.findAll({
      offset,
      limit,
      where: {
        userId: req.userId,
        status: req.params.status,
        title: { [Op.startsWith]: `%${title}%` }
      },
      attributes: { exclude: 'name' }, attributes: { exclude: 'name' }, include: [{ model: db.Image }]
    });

    if (allAds) {
      return {
        status: 'success',
        statusCode: 200,
        data: allAds,
        message: 'All ads retrieved successfully'
      };
    }
  }

  static async activateStatus(req) {
    const ad = await db.Product.findOne({
      where: { id: req.params.adId },
      attributes: { exclude: 'name' }
    });

    if (!ad) {
      return {
        status: 'error',
        statusCode: 404,
        message: ' Such ad was not found'
      };
    }

    const modifiedStatusDate = new Date();

    const newAd = await db.Product.update({ status: 'active', modifiedStatusDate: modifiedStatusDate }, { where: { id: req.params.adId } });
    ad.expireAd();

    return {
      status: 'success',
      statusCode: 200,
      data: newAd
    };
  }

  static async makePayment(req) {
    const paid = await db.Product.update(
      { type: 'Top', payDate: new Date(), status: 'active' },
      { where: { userId: req.userId, id: req.params.adId } }
    );

    if (paid[0] === 0) {
      return {
        status: 'error',
        statusCode: 403,
        message: 'You cannot make payment for this ad'
      };
    }

    const newAd = await db.Product.findOne({
      where: { id: req.params.adId },
      attributes: { exclude: 'name' }
    });

    return {
      status: 'success',
      statusCode: 200,
      data: newAd,
      message: 'Payment was made successfully'
    };
  }

  static async deactivatePayment(req) {
    const ad = await db.Product.findOne({
      where: { id: req.params.adId },
      attributes: { exclude: 'name' }
    });

    if (!ad) {
      return {
        status: 'error',
        statusCode: 404,
        message: ' Such ad was not found'
      };
    }

    const today = new Date();
    const diffInTime = today.getTime() - ad.payDate.getTime();
    const diffInDays = diffInTime / (1000 * 3600 * 24);

    if (diffInDays > 30) {
      await db.Product.update({ status: 'inactive' }, { where: { id: req.params.adId } });
      return {
        status: 'success',
        statusCode: 202,
        message: 'Payment is no longer valid'
      };
    }

    return {
      status: 'error',
      statusCode: 403,
      message: `It remains ${Math.round(30 - diffInDays)} days to make ad status inactive`
    };
  }

  static async editAd(req) {
    let { title, description, price } = req.body;
    if (title) title = title.capitalize().trim();
    if (description) description = description.capitalize().trim();
    if (price) price = price;
    const editedAd = await db.Product.update(
      { title: title, description: description, price: price },
      { where: { userId: req.userId, id: req.params.adId } }
    );
    console.log(editedAd);
    

    if (editedAd[0] === 0) {
      return {
        status: 'error',
        statusCode: 403,
        message: 'You cannot edit this ad'
      };
    }

    return {
      status: 'success',
      statusCode: 202,
      message: 'Ad has been successfully edited'
    };
  }

  static async deleteAd(req) {
    const deletedAd = await db.Product.destroy({
      where: { userId: req.userId, id: req.params.adId }
    });

    if (!deletedAd) {
      return {
        status: 'error',
        statusCode: 403,
        message: "You cannot delete this ad, there's no ad as such for you"
      };
    }

    return {
      status: 'success',
      statusCode: 200,
      message: 'Ad has been successfully deleted'
    };
  }
}

export default AdService;
