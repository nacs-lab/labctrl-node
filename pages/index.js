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

import CheckLogin from '../components/CheckLogin';
import GlobalContext from '../components/Global';
import RedirectIn from '../components/RedirectIn';
import Wrapper from '../components/Wrapper';

import api from '../lib/api';

import React from 'react';

function get_default_path(user, trusted) {
    if (!user && !trusted)
        return null;
    if (user && user.preferences && user.preferences.default_path)
        return user.preferences.default_path;
    return '/devices';
}

export async function getServerSideProps(ctx) {
    let { user, trusted } = (await api({ user: 'user',
                                         trusted: 'trusted' }, ctx));
    let default_path = get_default_path(user, trusted);
    if (default_path)
        return {
            redirect: {
                destination: default_path,
                permanent: false,
            },
        };
    return { props: {} };
}

export default class Main extends React.Component {
    static contextType = GlobalContext;
    render() {
        let { user, trusted } = this.context;
        let default_path = get_default_path(user, trusted);
        if (!default_path)
            default_path = '/devices';
        return <Wrapper>
          <CheckLogin approved={true}>
            <RedirectIn href={default_path} timeout={1}>
              {(timeout, props) => (<div>
                <b>Redirecting to default page in {timeout} seconds.</b>
              </div>)}
            </RedirectIn>
          </CheckLogin>
        </Wrapper>;
    }
}
