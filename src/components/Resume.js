import React, { Component } from 'react'
import dateFormat from 'dateformat'

// Helpers
import { slugify } from '../helpers/global'

import Icon from '../Icon'

class Resume extends Component {
  componentDidMount() {
    const bodyElement = document.getElementsByTagName("body")[0];
    if (this.props.isPrint) {
      bodyElement.classList.add("is-print");
    }
  }
  shouldComponentUpdate() {
    return false;
  }
  render() {
    const { resume, skills } = this.props
    return (
      <div className="resume">
        <div className="grid-wrapper">
          <div className="resume__document">
            <div className="resume__section">
              <div className="resume__grid">
                <div className="resume__left">
                  <h3>{resume.basics.name}</h3>
                  <p>{resume.basics.label}</p>
                </div>
                <div className="resume__right">
                  <p>{resume.basics.phone}</p>
                  <p>{resume.basics.email}</p>
                </div>
              </div>
            </div>

            <div className="resume__section">

              <div className="resume__grid">
                <div className="resume__left">
                  <h4 className="resume__section-heading">Profile</h4>
                  <p>{resume.basics.summary}</p>
                </div>
                <div className="resume__right isProfile">
                  <figure>
                    <img src="/assets/images/avatar.jpg" alt="Steve Urmston - Digital Product Designer" />
                  </figure>
                </div>
              </div>
            </div>

            <div className="resume__section">
              <h4 className="resume__section-heading">Experience</h4>

              {resume.work.map((work, index) => (
                <div key={`work-${index}`} className="resume__item">
                  <div className="resume__grid">
                    <div className="resume__left">
                      <h5 className="resume__title">
                        <strong>{work.position}</strong>,&nbsp;
                        {work.website ? (
                          <a href={work.website}>{work.company}</a>
                        ) : (
                          <span>{work.company}</span>
                        )}
                      </h5>
                      {work.summary && (
                        <p>{work.summary}</p>
                      )}
                      {work.highlights && (
                        <ul>
                        {work.highlights.map((highlight, index) => (
                          <li key={`work-highlight-${index}`}>{highlight}</li>
                        ))}
                        </ul>
                      )}
                    </div>
                    <div className="resume__right isDates">
                      {dateFormat(work.startDate, "mmm yyyy")}
                      &#8201;&#8211;&#8201;
                      {work.endDate ? (
                        <span>
                          {dateFormat(work.endDate, "mmm yyyy")}
                        </span>
                      ) : (
                        <span>Present</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            </div>

            <div className="resume__section">
              <h4 className="resume__section-heading">Education</h4>

              {resume.education.map((education, index) => (
                <div key={`education-${index}`} className="resume__item">
                  <div className="resume__grid">
                    <div className="resume__left">
                      <h5>
                        <strong>{education.studyType} {education.area}</strong>,&nbsp;
                        <span>{education.institution}</span>
                      </h5>
                      {education.highlights && (
                        <ul>
                        {education.highlights.map((highlight, index) => (
                          <li key={`education-highlight-${index}`}>{highlight}</li>
                        ))}
                        </ul>
                      )}
                    </div>
                    <div className="resume__right isDates">
                      {dateFormat(education.startDate, "yyyy")}
                      &#8201;&#8211;&#8201;
                      {education.endDate ? (
                        <span>
                          {dateFormat(education.endDate, "yyyy")}
                        </span>
                      ) : (
                        <span>Present</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="resume__section">
              <div className="resume__grid">
                <div className="resume__left">
                  <h4 className="resume__section-heading">Skills</h4>
                </div>
                <div className="resume__right">
                  <div className="resume__section-key">
                    {resume.skills.map((skill, index) => (
                      <span key={`skill-${index}`} className={slugify(skill.name)}>
                        <strong>{skill.name}</strong>
                        {skill.level === "Master" ? (
                          <Icon name="star" width="30" height="30" />
                        ) : (
                          null
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="resume__skills">
                {skills.map((skill, index) => (
                  <span key={`skill-tag-${index}`} className={`resume__tag ${skill.category}`}>
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Resume
