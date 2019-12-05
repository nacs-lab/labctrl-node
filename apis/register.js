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
const Email = require('../server/email');
const { absolute_url } = require('../server/url');
const { validate_email, validate_password } = require('../lib/account');

async function send_confirm_email(user, req) {
    let maxage = 2 * 24 * 60 * 60 * 1000; // 2 days
    let expires = new Date(Date.now() + maxage);
    let token = await user.new_token(User.Token.Verification, expires);
    let url = absolute_url(req, '/verify/' + token);
    await Email.send({
        to: user.email,
        subject: "Lab control account activation",
        text: `
Hello ${user.email},

Thank you for joining!

To complete your registration, please click here to confirm your registration
or copy and paste the following URL into your browser: (Note: be sure to copy the entire
URL, including any part of it which goes onto a second line.)

${url}

You may still need approval from the administrators before being able to access any equipments.

Cheers,

LabControl`,
        html: `
          <h3>Hello ${user.email},</h3>

          <p>Thank you for joining!</p>

          <p>
            To complete your registration, please <a href="${url}">click here to confirm</a>
            your registration or copy and paste the following URL into your browser:
            <i>
              (Note: be sure to copy the entire URL,
              including any part of it which goes onto a second line.)
            </i>
          </p>

          <b>${url}</b>

          <p>You may still need approval from the administrators before
            being able to access any equipments.</p>

          <p>Cheers,</p>

          <p>LabControl</p>`});
}

module.exports = async ({ req, res }, params) => {
    if (req.nacs_user)
        return { error: { email_msg: 'Already logged in. Please logout before register.' } };
    if (!params)
        return { error: { email_msg: 'No email or password given.' } };
    let email = params.email;
    let password = params.password;
    if (!email || !validate_email(email))
        return { error: { email_msg: 'Invalid email address.' } };
    if (!password)
        return { error: { password_msg: 'Invalid password.' } };
    let password_res = validate_password(password);
    if (password_res !== true)
        return { error: { password_msg: password_res } };
    let user = await User.signup(email, password);
    if (!user) {
        if (await User.find_user(email))
            return { error: { email_msg: 'Email address already registered.' } };
        return { error: { email_msg: 'Unknown error during registration.' } };
    }
    send_confirm_email(user, req);
    return { user: email };
};
