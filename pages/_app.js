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

import api from '../lib/api';
import GlobalContext from '../components/Global';

import React from 'react'
import App from 'next/app'

export default class NaCsApp extends App {
    constructor(props) {
        super(props);
        this.state = {
            user: props.user,
            set_user: (user) => { this.setState({ user }); }
        };
    }
    componentDidMount() {
        // This runs on the client side.
        this.timeout = setInterval(() => {
            api({'heartbeat': ''});
        }, 600 * 1000); // 10 minutes
    }
    componentWillUnmount() {
        // This runs on the client side.
        if (this.timeout !== undefined) {
            clearInterval(this.timeout);
        }
    }
    // This disables the static page rendering optimization and that's exactly what we want.
    // we want the global context to be available for all pages.
    static async getInitialProps(appContext) {
        // calls page's `getInitialProps` and fills `appProps.pageProps`
        const appProps = await App.getInitialProps(appContext);
        let user = (await api({'user': 'user'}, appContext.ctx)).user;
        return { user, ...appProps };
    }
    render() {
        const { Component, pageProps } = this.props;
        return <GlobalContext.Provider value={this.state}>
          <Component {...pageProps}/>
        </GlobalContext.Provider>;
    }
}
