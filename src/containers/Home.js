import React from 'react'
import { withRouteData } from 'react-static'
import convert from 'htmr'
import Projects from '../components/Projects'

export default withRouteData(({ home, projects }) => (
  <div>
    <section className="skills">
      <div className="grid-wrapper">
        {convert(home.contents)}
        <ul>
          <li>
            <h4>Product Management</h4>
            <p>Strategy, Business, Leadership</p>
          </li>
          <li>
            <h4>User Experience Design</h4>
            <p>Research and User Testing</p>
          </li>
          <li>
            <h4>UI & Interaction Design</h4>
            <p>For Web and Mobile</p>
          </li>
          <li>
            <h4>JavaScript Development</h4>
            <p>React, AngularJS, Node</p>
          </li>
          <li>
            <h4>Responsive Web Design</h4>
            <p>HTML, CSS, Sass</p>
          </li>
          <li>
            <h4>Digital Marketing</h4>
            <p>Analytics, CRO and SEO</p>
          </li>
        </ul>
      </div>
    </section>
    <Projects
      projects={projects}
      isFeatured="true"
    ></Projects>
  </div>
))