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

import { NotifyMenu, NotifyProvider } from './NotifyMenu';

import Head from 'next/head';
import Link from 'next/link';
import React from 'react';

// This relies on the css and js files loaded by the `_document.js`
export default class Wrapper extends React.Component {
    render() {
        let dom = <div className="wrapper">
          <Head>
            <title>Lab Control</title>
          </Head>
          {/* Navbar */}
          <nav className="main-header navbar navbar-expand navbar-white navbar-light">
            {/* Left navbar links */}
            <ul className="navbar-nav">
              <li className="nav-item">
                <a className="nav-link" data-widget="pushmenu" href="#"><i className="fas fa-bars"></i></a>
              </li>
            </ul>

            {/* Right navbar links */}
            <ul className="navbar-nav ml-auto">
              <NotifyMenu/>
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
              <nav className="mt-2">
                <ul className="nav nav-flat nav-pills nav-sidebar flex-column"
                  data-widget="treeview" role="menu" data-accordion="false">
                </ul>
              </nav>
              {/* /.sidebar-menu */}
            </div>
            {/* /.sidebar */}
          </aside>

          {/* Content Wrapper. Contains page content */}
          <div className="content-wrapper">
            {/* Main content */}
            <div className="content">
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
            <strong>Powered by <a href="https://nodejs.org" target="_blank">Node.js</a> and
              <a href="https://adminlte.io/" target="_blank">AdminLTE</a>.</strong>
          </footer>
        </div>;
        return <NotifyProvider>{dom}</NotifyProvider>;
    }
};
