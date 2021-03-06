import db from '../src/models';

class FavoriteService {
  static async createFavorite(req) {
    const adId = req.params.adId;
    const ad = await db.Product.findOne({ where: { id: adId }, attributes: { exclude: 'name' } });

    if (!ad) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'There is no such ad'
      }
    }

    const isExist = await db.Favorite.findOne({ where: { userId: req.userId, productId: adId } });
    if (isExist) {
      return {
        status: 'error',
        statusCode: 409,
        message: 'You already have this as your favorite'
      }
    }

    req.body.userId = req.userId;
    req.body.productId = adId;

    const favoriteAd = await db.Favorite.create(req.body);

    return {
      status: 'success',
      statusCode: 201,
      data: favoriteAd,
      message: 'Your favorite has been added successfully'
    }
  }

  static async getAFavorite(req) {
    const favorite = await db.Favorite.findOne({ where: { productId: req.params.adId, userId: req.userId } });

    if(!favorite) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'You don\'t have any favorite at the moment'
      }
    }

    return {
      status: 'success',
      statusCode: 200,
      data: favorite,
      message: 'Here is your favorite ad'
    }
  }

  static async getAllFavorites(req) {
    const favorites = await db.Favorite.findAll({ where: { userId: req.userId } });

    if(!favorites) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'You don\'t have any favorites at the moment'
      }
    }

    return {
      status: 'success',
      statusCode: 200,
      data: favorites,
      message: 'Here are your favorite ads'
    }
  }

  static async getAllAdFavorites(req) {
    const favorites = await db.Favorite.findAll({ where: { productId: req.params.adId } });

    if(!favorites) {
      return {
        status: 'error',
        statusCode: 404,
        message: 'No one has added this ad as favorite at the moment'
      }
    }

    return {
      status: 'success',
      statusCode: 200,
      data: favorites,
      message: 'Here are your favorite ads'
    }
  }

  static async getAllFavoritesByLimit(req) {
    const favorites = await db.Favorite.findAll({
      where: { userId: req.userId },
      limit: req.params.limit,
      order: [['id', 'DESC']]
    });

    return {
      status: 'success',
      statusCode: 200,
      data: favorites,
      message: 'All ads retrieved successfully'
    };
  }

  static async paginateAllFavorites(req) {
    const limit = req.params.limit;
    const offset = req.params.offset;
    const favorites = await db.Favorite.findAll({
      where: { userId: req.userId },
      offset,
      limit,
      order: [['id', 'DESC']]
    });

    return {
      status: 'success',
      statusCode: 200,
      data: favorites,
      message: 'All ads retrieved successfully'
    };
  }

  static async deleteFavorite(req) {
    const deletedFavorite = await db.Favorite.destroy(
      { where: { userId: req.userId, productId: req.params.adId } }
    );

    if(!deletedFavorite) {
      return {
        status: 'error',
        statusCode: 403,
        message: 'You cannot delete this favorite, there\'s no favorite as such for you'
      }
    }

    return {
      status: 'success',
      statusCode: 200,
      message: 'Ad has been successfully removed from favorites'
    }
  }
}

export default FavoriteService;