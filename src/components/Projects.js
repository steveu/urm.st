import React, { Component } from 'react'

// Components
import Project from './Project'

class Projects extends Component {
  shouldComponentUpdate () {
    return false
  }

  render () {
    const { isFeatured } = this.props
    let projects = this.props.projects.sort((a, b) => (a.order > b.order) ? 1 : -1)

    if (isFeatured) {
      projects = projects.filter(project => project.feature)
    }

    return (
      <div>
        {projects.map(project => (
          <Project
            key={`project-${project.slug}`}
            project={project}
          />
        ))}
      </div>
    )
  }
}

export default Projects
