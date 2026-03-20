'use strict';

module.exports = {
  ...require('./BasePOSAdapter'),
  ...require('./StripeAdapter'),
  ...require('./CloverAdapter'),
  ...require('./GenericPOSAdapter'),
};
