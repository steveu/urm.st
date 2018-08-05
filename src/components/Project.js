import React, { PureComponent } from 'react'
import { Link } from 'react-static'

import WindowChrome from './WindowChrome'

class Project extends PureComponent {

  renderFigure(project) {
    switch(project.type) {
      case 'video':
        return (
          <figure className="work__figure">
            <div className="fluid-video">
              <video loop controls preload="auto">
                <source src={project.video} />
              </video>
            </div>
          </figure>
        )
      case 'iframe':
        return (
          <figure className="work__figure">
            <div className="fluid-iframe">
              <iframe
                width="100%"
                src={project.iframe}
                frameBorder="0"
                marginWidth="0"
                marginHeight="0"
                scrolling="no"
                allowFullScreen=""
              ></iframe>
            </div>
          </figure>
        )
      default:
        return (
          <figure className="work__figure">
            {project.case_study ? (
              <Link to={`/work/${project.slug}/`}>
                <WindowChrome
                  image={project.image}
                  frame_class={project.frame_class}
                />
              </Link>
            ) : (
              <WindowChrome
                image={project.image}
                frame_class={project.frame_class}
              />
            )}
          </figure>
        )
    }
  }

  render () {
    const { project } = this.props
    return (
      <section className={project.class} key={project.slug}>
        <div className="grid-wrapper">
          <div className="work">
            {this.renderFigure(project)}
            <aside className="work__description">
              <h2>{project.title}</h2>
              <p className="subtitle">{project.subtitle}</p>
              {project.description.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {project.link && (
                <p>
                  <a href={project.link}>
                    {project.link}
                  </a>
                </p>
              )}
              {project.case_study && (
                <Link className="button" to={`/work/${project.slug}/`}>
                  Read case study
                </Link>
              )}
              {project.download && (
                <a className="button" href={project.download}>
                  Download the PDF
                </a>
              )}
            </aside>
          </div>
        </div>
      </section>
    )
  }
}

export default Project