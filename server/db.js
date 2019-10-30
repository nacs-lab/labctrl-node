/*************************************************************************
 *   Copyright (c) 2019 - 2019 Yichao Yu <yyc1992@gmail.com>             *
 *                                                                       *
 *   This library is free software; you can redistribute it and/or       *
 *   modify it under the terms of the GNU Lesser General Public          *
 *   License as published by the Free Software Foundation; either        *
 *   version 3.0 of the License, or (at your option) any later version.  *
 *                                                                       *
 *   This library is distributed in the hope that it will be useful,     *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of      *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU    *
 *   Lesser General Public License for more details.                     *
 *                                                                       *
 *   You should have received a copy of the GNU Lesser General Public    *
 *   License along with this library. If not,                            *
 *   see <http://www.gnu.org/licenses/>.                                 *
 *************************************************************************/

"use strict";

const config = require('./config');

const cls = require('continuation-local-storage');
const Sequelize = require('sequelize');
const path = require('path');

const logging = !!process.env.NACS_DB_LOGGING;

const ret_null = logging ? (err) => {
    console.log(err);
    return null;
} : () => null;

const get_handler = logging ? function (val) {
    return (err) => {
        console.log(err);
        return val;
    }
} : function (val) {
    return () => val;
};

class DB extends Sequelize {
    static namespace = cls.createNamespace('labctrl-sequelize-ns');
    constructor(name) {
        super(null, null, null, {
            dialect: 'sqlite',
            storage: path.join(config.db.dir, name),
            logging: !!process.env.NACS_DB_LOGGING
        });
    }
    transaction(options, callback) {
        if (typeof options === 'function') {
            callback = options;
            options = {};
        }
        else {
            options = options || {};
        }
        // Pass in the parent transaction as an option automatically
        // if one is set in the CLS.
        let t = DB.namespace.get('transaction');
        if (t)
            options.transaction = t;
        return super.transaction(options, callback);
    }
    err_handler(val) {
        if (val === null)
            return ret_null;
        return get_handler(val);
    }
}
DB.useCLS(DB.namespace);

module.exports = DB;
