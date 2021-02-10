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

const DB = require('./db');
const account = require('../lib/account');

const bcrypt = require('bcrypt');
const crypto = require('crypto');

const db = new DB('user.db');

function get_rand_bytes(len) {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(len, function (err, buf) {
            if (err)
                return reject(err);
            resolve(buf);
        });
    });
}

// This should be the hash function used for all secret fields.
async function secure_hash(input) {
    return await bcrypt.hash(input, 8);
}

// Do not include `requested` so that normal user won't
// know when an admin ignored the request.
const info_attrs = ['email', 'verified', 'approved', 'admin', 'preferences'];

class User extends DB.Model {
    static Token = account.Token;
    // Minimum three days login time.
    static min_login_time = 3 * 24 * 60 * 60 * 1000;
    // Hijack the init function ;-p
    // The importer should wait for `User.init()` before continuing.
    static init(...args) {
        if (args.length > 0)
            return super.init(...args);
        return init_job;
    }
    static async find_user(email) {
        return await this.findOne({ where: { email } });
    }
    static async signup(email, password) {
        return await db.transaction(async () => {
            let password_hash = await secure_hash(password);
            return await this.create({ email, password_hash });
        }).catch(db.err_handler(null));
    }
    static async all_infos() {
        // Return public info about all the users
        // For admin interface
        return await this.findAll({ attributes: [...info_attrs, 'requested'] });
    }
    static async invite(email) {
        return await db.transaction(async () => {
            return await this.create({ email, approved: true });
        }).catch(db.err_handler(null));
    }
    static async login(email, password) {
        let user = await this.find_user(email);
        if (!user)
            return null;
        // 6s minimum wait time.
        if (user.last_failed && Date.now() - user.last_failed < 6000)
            return null;
        let match = await user.match_password(password);
        if (!match || user.last_failed) {
            await db.transaction(async () => {
                user.update({ last_failed: match ? null : new Date(Date.now()) });
            }).catch(db.err_handler(null));
            if (!match) {
                return null;
            }
        }
        // Return non-verified error only when authentication succeeded
        // to avoid leaking info about valid email address.
        if (!user.verified)
            return false;
        return user;
    }
    info() {
        let res = {};
        for (let i in info_attrs) {
            let attr = info_attrs[i];
            res[attr] = this[attr];
        }
        return res;
    }
    async match_password(password) {
        if (!this.password_hash)
            return false;
        return await bcrypt.compare(password, this.password_hash);
    }
    async update_password(password) {
        return await db.transaction(async () => {
            let password_hash = await secure_hash(password);
            return await this.update({ password_hash });
        }).catch(db.err_handler(null));
    }
    async request() {
        return await db.transaction(async () => {
            if (!this.approved)
                return await this.update({ requested: true });
            return this;
        }).catch(db.err_handler(null));
    }
    async set_approved(approved) {
        return await db.transaction(async () => {
            if (approved)
                return await this.update({ approved: true, requested: false });
            return await this.update({ admin: false, approved: false, requested: false });
        }).catch(db.err_handler(null));
    }
    async ignore() {
        return await db.transaction(async () => {
            return await this.update({ requested: false });
        }).catch(db.err_handler(null));
    }
    async set_admin(admin) {
        return await db.transaction(async () => {
            if (admin)
                return await this.update({ admin: true, approved: true, requested: false });
            return await this.update({ admin: false, requested: false });
        }).catch(db.err_handler(null));
    }
    async verify() {
        return await db.transaction(async () => {
            if (this.approved)
                return await this.update({ verified: true });
            return await this.update({ verified: true, requested: true });
        }).catch(db.err_handler(null));
    }

    // Token
    async new_token(type, expires) {
        return await db.transaction(async () => {
            let {tag, hash: tag_hash} = await Token.new_tag();
            let {value, hash: value_hash} = await Token.new_value();
            await Token.create({ tag: tag_hash, value: value_hash, type, expires,
                                 userId: this.id });
            return tag + '*' + value;
        }).catch(db.err_handler(null));
    }
    static async find_token(token) {
        let s = token.split('*');
        if (s.length != 2)
            return null;
        return await db.transaction(async () => {
            let t = await Token.find_tag(s[0]);
            if (!t || !(await t.match_value(s[1])))
                return null;
            if (t.expires <= Date.now()) {
                t.destroy();
                return null;
            }
            return t;
        }).catch(db.err_handler(null));
    }
}
User.init({
    id: {
        type: DB.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true
    },
    email: {
        type: DB.STRING,
        allowNull: false,
        unique: true
    },
    verified: {
        type: DB.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    approved: {
        type: DB.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    admin: {
        type: DB.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    requested: {
        type: DB.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    password_hash: DB.STRING,
    last_failed: DB.DATE,
    preferences: {
        type: DB.JSON,
        allowNull: false,
        defaultValue: {}
    }
}, {
    sequelize: db,
    modelName: 'user'
});

function hash_sha512(bytes, encoding) {
    return crypto.createHash('sha512').update(bytes).digest(encoding);
}

class Token extends DB.Model {
    static async find_tag(tag) {
        let bytes = Buffer.from(tag, 'base64');
        let hash = hash_sha512(bytes, 'base64');
        return await this.findOne({ where: { tag: hash } });
    }
    static async new_tag() {
        while (true) {
            let bytes = await get_rand_bytes(33);
            let hash = hash_sha512(bytes, 'base64');
            if (await this.count({ where: { tag: hash } }))
                continue;
            return { tag: bytes.toString('base64'), hash };
        }
    }
    static async new_value() {
        while (true) {
            let value = (await get_rand_bytes(33)).toString('base64');
            let hash = await secure_hash(value);
            if (await this.count({ where: { value: hash } }))
                continue;
            return { value, hash };
        }
    }
    async match_value(value) {
        return await bcrypt.compare(value, this.value);
    }
    async update_expire(expires) {
        return await db.transaction(async () => {
            return await this.update({ expires });
        }).catch(db.err_handler(null));
    }
    async invalidate() {
        return await db.transaction(async () => {
            await this.destroy();
            return true;
        }).catch(db.err_handler(false));
    }
    async isvalid() {
        return await db.transaction(async () => {
            if ((await Token.count({ where: { id: this.id }})) == 0)
                return false;
            await this.reload();
            return this.expires > Date.now();
        }).catch(db.err_handler(false));
    }
}
Token.init({
    // This is used for looking up the token so the computation must be unique.
    tag: {
        type: DB.STRING,
        allowNull: false,
        unique: true
    },
    // This is used for verification and should be as secure as the password hashing.
    value: {
        type: DB.STRING,
        allowNull: false,
        unique: true
    },
    type: {
        type: DB.INTEGER,
        allowNull: false
    },
    expires: {
        type: DB.DATE,
        allowNull: false
    }
}, {
    sequelize: db,
    modelName: 'token'
});
Token.belongsTo(User);

const init_job = db.sync();

module.exports = User;
