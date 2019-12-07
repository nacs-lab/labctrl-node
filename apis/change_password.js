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

const User = require('../server/user');
const { validate_password } = require('../lib/account');

module.exports = async ({ req, res }, params) => {
    if (!req.nacs_user)
        return { error: { new_password_msg: 'Please login before changing password.' } };
    if (!params)
        return { error: { new_password_msg: 'No password given.' } };
    let new_password = params.new_password;
    if (!new_password)
        return { error: { new_password_msg: 'New password cannot be empty.' } };
    let password_res = validate_password(new_password);
    if (password_res !== true)
        return { error: { new_password_msg: password_res } };
    if (params.token) {
        let token = await User.find_token(params.token);
        if (!token || (token.type != User.Token.ResetPassword &&
                       token.type != User.Token.Invitation)) {
            return { error: { new_password_msg: 'Invalid password reset token.' } };
        }
        let user = await token.getUser();
        if (!user || user.email != req.nacs_user.email) {
            return { error: { new_password_msg: 'Invalid password reset token.' } };
        }
        await token.invalidate();
    }
    else {
        let old_password = params.old_password;
        if (!(await req.nacs_user.match_password(old_password))) {
            return { error: { old_password_msg: 'Incorrect old password.' } };
        }
    }
    if (!(await req.nacs_user.update_password(new_password)))
        return { error: { new_password_msg: 'Unknown error.' } };
    return { success: true };
};
