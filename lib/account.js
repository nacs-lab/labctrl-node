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

module.exports.Token = {
    Invitation: 1,
    Verification: 2,
    LoginSession: 3,
    ResetPassword: 4,
    LoginSessionLong: 5,
};

const email_re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

function validate_email(email) {
    return email_re.test(email);
}
module.exports.validate_email = validate_email;

const num_only = /^[0-9]*$/;
const letter_only = /^[a-zA-Z]*$/;

function validate_password(password) {
    if (password.length >= 12)
        return true;
    if (num_only.test(password))
        return 'Number only password must be at least 12 characters long.';
    if (letter_only.test(password))
        return 'Letter only password must be at least 12 characters long.';
    if (password.length < 8)
        return 'Password must be at least 8 characters long.';
    return true;
}
module.exports.validate_password = validate_password;
