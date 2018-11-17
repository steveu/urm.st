---
title: Bytemark Cloud Backups
slug: bytemark-cloud
start: 2014
end: Present
tags:
  - Product Strategy
  - UI Design
  - UX Design
  - Front-end Development
---

<div class="article__header" style="background-image: url('/articles/bytemark-cloud/how-might-we.jpg')">
  <h1>
    <span>
      How we designed, developed and launched a backup feature for Bytemark Cloud.
    </span>
  </h1>
</div>

<p class="article__meta">
  How we added a major feature to Bytemark Cloud, during my time as Product Manager and Product Team lead 2016/17.
</p>

### Why backups?

From regular customer interviews, the Product team at Bytemark identified server backups as a both consistent pain point, and an area where our Cloud hosting product was lacking.

We often saw anxiety from customers who did not have, or were unsure if they *actually* had the backups they would need in a crisis. Some of our customers had found peace of mind using custom scripting, but at the expense of ongoing maintenance and storage costs.

> “I always have that bit of doubt whether the backup is actually running”

Helping our customers to feel secure at Bytemark was an opportunity too good to miss!

### A five day design sprint

We knew from initial research that delivering a great backup service would be a significant challenge for the company. We decided to meet this by bringing together people from across the organisation for a five day [Google Ventures design sprint](http://www.gv.com/sprint/).

<figure class="article__figure is-wide">
  <img src="/articles/bytemark-cloud/bytemark-cloud-sprint-roadmap.jpg" alt="Design Sprint roadmap for Bytemark Cloud Backups" />
</figure>

On day one, we developed our **long term goal**, and chose a narrow target of existing cloud customers, and two tasks to prototype; configuring backups and restoring from a backup. By day 4 we had completed various group design exercises and were ready to prototype and test.

### User testing a prototype

We built our prototype in a day, using our existing product as a framework and HTML/CSS and JavaScript. Although we took shortcuts, the process challenged our coding skills and ability to handle pressure.

In hindsight I would exchange this process for a prototyping tool. That said, placing the prototype within an already familiar product did help to orient our user testers.

<figure class="article__figure">
  <div class="fluid-video one-to-zero-six-eight">
    <video title="Video of prototype backup feature" controls="true" preload="auto">
      <source src="/articles/bytemark-cloud/backup-prototype.mp4" />
    </video>
  </div>
</figure>

### Building a Beta

I used the outcomes from our usability research to sketch an interface that was both highlight configurable to account for complicated backup scheduling, whilst keeping the basic service simple enough so all customers could use the feautre with minimal effort.

> Is time critical, so finding on panel is easier, "is point and click."

<div class="article_images">
  <figure>
    <img src="/articles/bytemark-cloud/sketches.jpg" alt="Initial sketches of backup feature" />
  </figure>
  <figure>
    <img src="/articles/bytemark-cloud/prototype-screenshot3.png" alt="Screenshot of backup prototype" />
  </figure>
  <figure>
    <img src="/articles/bytemark-cloud/prototype-screenshot4.png" alt="screenshot of initial backup UI design" />
  </figure>
  <figure>
    <img src="/articles/bytemark-cloud/clicktest.png" alt="Screenshot of clicktest results" />
  </figure>
  <figure>
    <img src="/articles/bytemark-cloud/terminal-prototype.jpg" alt="Screenshot of a teminal backup recovery" />
  </figure>
</div>

### Easy backups for everyone, by default

This was a challenging project for the Engineering team at Bytemark, and myself as an inexperienced Product Manager. We had to make various compromises over the feature set we could deliver to customers before proving revenue.

I’m proud of the pricing structure I developed that was fair to customers who used it extensively and to the company’s investment, but still provided a free service. By default, for all customers.
