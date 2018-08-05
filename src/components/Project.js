import React, { PureComponent } from 'react'
import { Link } from 'react-static'

import WindowChrome from './WindowChrome'

class Project extends PureComponent {

  renderFigure(project) {
    switch(project.type) {
      case 'video':
        return (
          <figure className="work__figure">
            <div class="fluid-video">
              <video autoplay="" loop="" controls preload="auto">
                <source src={project.video} />
              </video>
            </div>
          </figure>
        )
      case 'iframe':
        return (
          <figure className="work__figure">
            <div class="fluid-iframe">
              <iframe
                width="100%"
                src={project.iframe}
                frameborder="0"
                marginwidth="0"
                marginheight="0"
                scrolling="no"
                allowfullscreen=""
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
              {project.description.map(paragraph => (
                <p>{paragraph}</p>
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