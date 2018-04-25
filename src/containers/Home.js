import React from 'react'
import { withRouteData, Link } from 'react-static'
import convert from 'htmr'
import Icon from 'Icon'
//

export default withRouteData(({ home, projects }) => (
  <div>
    <section>
      <div className="wrapper">
        {convert(home.contents)}
        <ul className="skills">
          <li>
            <h3>Product Management</h3>
            <p>Strategy, Business Analytics</p>
          </li>
          <li>
            <h3>User Experience Design</h3>
            <p>User testing, Wireframes, Prototyping</p>
          </li>
          <li>
            <h3>UI & Interaction Design</h3>
            <p>For Web and Mobile</p>
          </li>
          <li>
            <h3>JavaScript Development</h3>
            <p>AngularJS, React, Vue</p>
          </li>
          <li>
            <h3>Responsive Web Design</h3>
            <p>HTML, CSS</p>
          </li>
          <li>
            <h3>Digital Marketing</h3>
            <p>Analytics, CRO and SEO</p>
          </li>
        </ul>
      </div>
    </section>
    {projects.map(project => (
      <section className={project.class} key={project.slug}>
        <div className="wrapper work">
          <figure>
            <Link to={`/work/${project.slug}/`}>
              <img src={`projects/${project.slug}-hero.png`} width="400px" />
            </Link>
          </figure>
          <aside>
            <h2>{project.title}</h2>
            <p>{project.description}</p>
          </aside>
        </div>
      </section>
    ))}

  </div>
))