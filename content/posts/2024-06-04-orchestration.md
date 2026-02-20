+++
author = "Florian Hussonnois"
title = "Navigating Complexity: The Rise of Orchestration Platforms in a Disaggregated Software Architecture Landscape"
date = "2024-06-04"
tags = [
    "kestra",
    "architecture",
    "orchestration",
]
draft = false
cover = "https://cdn-images-1.medium.com/max/2048/1*jeEoCSC6yg9Nk-fUseb55Q.jpeg"
+++

_This blog post was originally published on [Medium](https://medium.com/@fhussonnois/navigating-complexity-the-rise-of-orchestration-platforms-in-a-disaggregated-software-architecture-465b6f791f9c)_

![](https://cdn-images-1.medium.com/max/2048/1*jeEoCSC6yg9Nk-fUseb55Q.jpeg)

## **The challenge to solve: The disaggregation of software architectures**

For some years now, software organizations have been facing what we might call "**the disaggregation of software architectures**". All-in-one solutions, frameworks, and traditional databases have gradually given way to a multitude of more specialized solutions, each as complex as their predecessors, if not more.

The increasingly rapid and massive adoption of solutions from Cloud Providers has inevitably accelerated and reinforced this trend, fuelling the complexity of modern software architectures. Add to this, the enthusiasm for AI and now Generative-AI has catalyzed innovations that promise to reshape the software development landscape.

Let’s consider the example of data warehousing: Today, most organizations use a hybrid analytical platform. Such a platform involves managing data processing, storage, and catalogs through a variety of solutions. Over time, these platforms are enhanced by some tools and AI capabilities to improve security, monitoring, data integrity, and accuracy. But, in the end, all these solutions have to be integrated together using some magic glue, leading to an intricate endless jungle of disparate components.

Of course, the emergence of new specialized solutions enables organizations to implement more flexible and scalable architectures, unlocking new opportunities with the promise of accelerated time-to-market.

However, **reality often falls short of expectations!**

The disaggregation of software stacks has led organizations to build and operate their businesses around an assembly of complex and esoteric services, requiring specialized expertise.

The truth is that most engineering teams lack the time and resources to manage the burden and responsibility of all these new solutions. They are overwhelmed by a high cognitive load, spending more time managing architecture and service integration than developing business value in their applications.

Thus, the increasing complexity of software architectures has led to many new frictions for developers, and for many organizations, the developer experience has been slowly sacrificed on the altar of modern, cloud-native architectures. As a result, the initial promises have given way to much more maintenance, operational overheads, and higher costs.

So, what could be the strategies for coping with this complexity and restoring efficiency in our development teams? To help answer this question, let’s take a look at one of the hottest topics in the DevOps ecosystem at the time of writing.

## **A first answer: Platform Engineering**

In response to the challenges posed by modern software architectures and the proliferation of specialized technologies and services, [Platform Engineering](https://platformengineering.org/blog/what-is-platform-engineering) has recently emerged as the new way to support developers in large software organizations.

Platform Engineering enhances and enriches the principles already supported by the DevOps discipline with a promise relatively simple and similar : **to enable development teams to be more efficient!**

But how do we get there? Well, the short answer is to establish [**platform engineering product teams**](https://www.thoughtworks.com/en-de/radar/techniques/platform-engineering-product-teams) whose highest priority is to remove developer friction by offering them a golden path for delivering applications.

>  According to [Garner](https://www.gartner.com/en/articles/what-is-platform-engineering): by 2026, 80% of large software organizations will establish engineering teams acting as internal service providers and as a bridge between development teams, ISV (Independent software vendor), and Cloud providers.

The core idea behind Platform Engineering is to provide self-serve capabilities to development teams for automating, optimizing, and accelerating the delivery of their software applications. To design, build, and supply those self-serve capabilities, Platform Engineering introduces the concept of an [Internal Developer Platform](https://internaldeveloperplatform.org/) (IDP).

The Internal Developer Platform aims to be an abstraction layer for simplifying and standardizing the usage of complex and disparate services. It is specific to each organization’s needs, and provides reusable toolchains, workflows, services, and infrastructure in the form of products and SaaS (Solution As a Service).

This concept has highlighted one of the physiological needs of any software organization in order to tackle the complexity of modern architectures and support developers: **the need to orchestrate and automate everything!**

But what is the state of orchestration in modern architectures — what kind of solutions are we trying to converge towards?

## Towards the Orchestration Platform as a Backbone

Orchestration has always played a crucial role in automating, coordinating, schedulind, and managing complex workflows and services within a hybrid enterprise infrastructure. But, for one reason or another, it has always taken a back seat.

In the past, orchestration and automation solutions have always tended to be specialized solutions too, targeting a single problem or domain: CI/CD Pipelines, Infrastructure-as-Code provisioning, Data integration, or Business Process workflows.

In addition, some of them are also designed for specific engineering teams. [**Apache Airflow**](https://airflow.apache.org/), for example, is a wildly used solution to orchestrate Data Pipelines, but as it makes advanced use of the Python language, it’s hard to imagine it being used by teams other than Data Scientists and Data Engineers.

The adoption of Platform Engineering gave birth to another new generation of tools called [**Platform Orchestrators**](https://www.thoughtworks.com/en-de/radar/techniques/platform-orchestration). Those tools seem to sit in the middle by integrating existing CI/CD pipelines, with hardware infrastructure resources (e.g. Kubernetes, Database, DNS, etc) and Cloud provider specificities. Unfortunately, despite the progress made those new platforms seem to only address the DevOps part of the modern architecture complexity spectrum.

To tackle the challenges of modern software architectures as a whole, organizations need a **modern enterprise orchestration platform** that serves as the backbone for coordinating and integrating all of the organization’s digital assets, across all the organization’s domains.

Such a platform must be versatile offer a unified framework and API for automation and orchestration, delivering end-to-end visibility of the processes and infrastructures that support the organization’s day-to-day engineering operations. It should boost standardization and consistency across teams, environments, and processes, helping to reduce misconfiguration and the risk of creating security vulnerabilities.

In addition, **a modern orchestration platform** needs to be a fast track for development teams. Developers should be able to quickly experiment and build complex use cases through a simple user interface (UI) accessible to the widest possible audience, not only those with coding skills.

For this, an orchestration platform must also be a [**low-code development platform (LCDP)**](https://en.wikipedia.org/wiki/Low-code_development_platform) by leveraging a declarative approach for workflows definitions, rather than an existing or new programming language. There’s no real debate in this area, YAML is the de facto standard for declaring logical flows. It’s already widespread in the DevOps ecosystem and well known to developers.

Finally, enterprise orchestration platforms need to embrace the principles of the *Engineering Platform*, enabling the creation and use of self-service workflows that will support developers in any part of their software and business value creation process. To do so, they must offer an advanced [RBAC](https://en.wikipedia.org/wiki/Role-based_access_control) (Role-Based Access Control) system, allowing granular control of user access rights and permissions.

## Final thoughts

Navigating the complex landscape of modern architectures and the cloud-native era has become a journey not without risk for most large software organizations.

The mass adoption of specialized solutions has only heightened the complexity of integrating and coordinating together the various infrastructures and solutions used across an entire organization. This has led to a poor developer experience and increased friction, significantly impacting the productivity and ability of organizations to deliver applications and business value efficiently.

In this context, the role of enterprise orchestration platforms acting as a backbone has risen to the forefront, ensuring unified and seamless automation and coordination of workflows.

By serving as the **central nervous system of modern IT environments**, enterprise orchestration platforms are emerging as a strategic approach for creating a streamlined and efficient path for both developers and engineering teams.

Open-source orchestration platforms, like [**Kestra**](https://kestra.io/), aim to provide such a unified framework by striving to reconcile the different facets of orchestration, offering a scalable and agile platform that serves and unlocks the productivity of ops, data, and engineering teams.

