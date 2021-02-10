/*************************************************************************
 *   Copyright (c) 2019 - 2021 Yichao Yu <yyc1992@gmail.com>             *
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
import GlobalContext from './Global';
import MainSidebar from './MainSidebar';
import { NotifyMenu, NotifyProvider } from './NotifyMenu';
import { hash_md5 } from '../lib/crypto';

import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

// This relies on the css and js files loaded by the `_document.js`
export default class Wrapper extends React.Component {
    static contextType = GlobalContext;
    logout = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        await api({ logout: 'logout' });
        this.context.set_user(null);
    }
    render() {
        let user;
        if (!this.context.user) {
            user = {
                name: 'Anonymous',
                hash: '00000000000000000000000000000000',
                anonymous: true,
                admin: false
            };
        }
        else {
            user = {
                name: this.context.user.email,
                hash: hash_md5(this.context.user.email),
                anonymous: false,
                admin: this.context.user.admin
            };
        }
        let user_dropdown;
        if (user.anonymous) {
            // Use a different fallback for anonymous so that people
            // that doesn't have an gravatar account can still
            // use the icon to tell if they are logged in or not.
            user.avatar = 'https://www.gravatar.com/avatar/' + user.hash + '?d=mp';
            // Note that these links do not automatically forward
            // the email/password info as the corresponding links
            // on the login/password reset/register pages does.
            // Fixing that is probably possible by putting some callback/info
            // into some context but I don't think this drop down menu
            // would be that useful when the link is directly available on the page
            // so I don't think it'll be worth the effort....
            user_dropdown = <div className="dropdown-menu dropdown-menu-right">
              <Link href="/login">
                <a className="dropdown-item">
                  <i className="fas fa-sign-in-alt mr-2"></i> Login
                </a>
              </Link>
              <div className="dropdown-divider"></div>
              <Link href="/register">
                <a className="dropdown-item">
                  <i className="fas fa-user-plus mr-2"></i> Register
                </a>
              </Link>
            </div>;
        }
        else {
            user.avatar = 'https://www.gravatar.com/avatar/' + user.hash;
            user_dropdown = <div className="dropdown-menu dropdown-menu-right">
              <span className="dropdown-header">
                <a href={'https://www.gravatar.com/' + user.hash} target="_blank">
                  <img src={user.avatar} className="img-circle"/>
                </a>
                <br/>
                {user.name}
              </span>
              <div className="dropdown-divider"></div>
              <Link href="/profile">
                <a className="dropdown-item">
                  <i className="fas fa-id-card mr-2"></i> Profile
                </a>
              </Link>
              <Link href="/config">
                <a className="dropdown-item">
                  <i className="fas fa-edit mr-2"></i> Device Config
                </a>
              </Link>
              <Link href="/demo">
                <a className="dropdown-item">
                  <i className="fas fa-code mr-2"></i> Demo
                </a>
              </Link>
              {
                  user.admin ? <React.Fragment>
                    <div className="dropdown-divider"></div>
                    <Link href="/admin">
                      <a className="dropdown-item">
                        <i className="fas fa-users-cog mr-2"></i> Admin
                      </a>
                    </Link>
                  </React.Fragment> : <React.Fragment/>
              }
              <div className="dropdown-divider"></div>
              <a href="#" className="dropdown-item" onClick={this.logout}>
                <i className="fas fa-sign-out-alt mr-2"></i> Log out
              </a>
            </div>;
        }
        let dom = <div className="wrapper">
          <Head>
            <title>Lab Control</title>
          </Head>
          {/* Navbar */}
          <nav className="main-header navbar navbar-expand navbar-white navbar-light">
            {/* Left navbar links */}
            <ul className="navbar-nav">
              <li className="nav-item">
                <a className="nav-link" id="sidebar-button"
                  data-widget="pushmenu" href="#"><i className="fas fa-bars"></i></a>
              </li>
            </ul>

            {/* Right navbar links */}
            <ul className="navbar-nav ml-auto">
              <NotifyMenu/>
              <li className="nav-item dropdown">
                <a className="nav-link" data-toggle="dropdown" href="#">
                  <img src={user.avatar} className="img-circle"
                    style={{ height: "2em", marginTop: "-5px" }}/>
                </a>
                {user_dropdown}
              </li>
            </ul>
          </nav>
          {/* /.navbar */}

          {/* Main Sidebar Container */}
          <aside className="main-sidebar sidebar-light-cyan elevation-4">
            {/* Brand Logo */}
            <Link href="/">
              <a className="brand-link">
                <img src="/favicon.ico" alt="Lab Control Logo"
                  className="brand-image img-circle elevation-3" style={{opacity: .8}}/>
                <span className="brand-text font-weight-light">Lab Control</span>
              </a>
            </Link>

            {/* Sidebar */}
            <div className="sidebar">
              {/* Sidebar Menu */}
              <MainSidebar/>
              {/* /.sidebar-menu */}
            </div>
            {/* /.sidebar */}
          </aside>

          {/* Content Wrapper. Contains page content */}
          <div className="content-wrapper" style={{ overflow: 'auto' }}>
            {/* Main content */}
            <div className="content h-100">
              <div className="container-fluid">
                <div className="row">
                  {this.props.children}
                </div>
                {/* /.row */}
              </div>{/* /.container-fluid */}
            </div>
            {/* /.content */}
          </div>
          {/* /.content-wrapper */}

          {/* Control Sidebar */}
          <aside className="control-sidebar control-sidebar-light">
            {/* Control sidebar content */}
            <div className="p-3">
            </div>
          </aside>
          {/* /.control-sidebar */}

          {/* Main Footer */}
          <footer className="main-footer">
            <strong>Powered by <a href="https://nodejs.org" target="_blank">Node.js</a>{','}
              <span> </span><a href="https://nextjs.org" target="_blank">Next.js</a>{','}
              <span> </span><a href="https://getbootstrap.com" target="_blank">Bootstrap</a>
              <span> </span>and<span> </span>
              <a href="https://adminlte.io" target="_blank">AdminLTE</a>.
            </strong>
          </footer>
          {/* Manually add the sidebar overlay to make React aware of this.
            * This makes sure that the overlay can stay up when we switch page
            * using the `<Link/>` element which may cause a re-rendering of the page.
            * without reloading the scripts (from AdminLTE)
            * that would have set up the overlay if this wasn't there. */}
          <div id="sidebar-overlay"
            onClick={()=>$('#sidebar-button').PushMenu('collapse')}></div>
        </div>;
        return <NotifyProvider>{dom}</NotifyProvider>;
    }
};
