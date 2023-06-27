---
title: How I Passed the CRTO Exam in Two Weeks
date: 2023-06-26
layout: post
tags: certification-exam
---

# What is CRTO?

The [Certified Red Team Operator (CRTO)](https://training.zeropointsecurity.co.uk/courses/red-team-ops) is a fantastic certification for anyone looking to improve their internal netpen experience with some adversary simulation tools and techniques. The course is fairly self-contained and teaches all the exploitation and abuse methods needed to pass the exam. In addition to the course, you can also get subscription access to a well-built lab environment which gives you the opportunity to try out all the attacks taught in the course on live targets. 

## Why You Should Get It

A unique feature of the RTO labware is that a licensed copy of [Cobalt Strike](https://www.cobaltstrike.com/) plus some [awesome kits](https://download.cobaltstrike.com/scripts) are provided to tinker and play around with. This really adds a dimension of realism since Cobalt Strike is usually only available to enterprises with deep pockets and those who know of a certain, le-funny site. 

Furthermore, RTO ups the difficulty by just a bit from the usual [HackTheBox](https://www.hackthebox.com/)/[TryHackMe](https://tryhackme.com/) machines since the exam machines all have AV turned on which forces students to be cognizant of disk, memory, and behavior detections common on most Windows machines via Defender/AMSI. Students first learn all the tooling and techniques on machines with AV disabled, then, as practice for the exam, RTO encourages students to enable AV on the entire lab and re-practice everything to simulate the exam.

My biggest praise, however, for the RTO course is that there is an active community of students who are always available to help and answer questions about the course, lab, or exam. In fact, there was even a time when [RastaMouse](https://twitter.com/_RastaMouse) got on Discord to answer my questions on the weekend, and added a whole Ghidra module to the course because I was having trouble finding the byte sequences in my beacon payloads which were being flagged by AV.

# My Journey

If you follow me on LinkedIn, you might have heard that I recently started my second summer internship in offensive security with [IBM's X-Force Red](https://www.ibm.com/services/offensive-security) as a Penetration Testing intern. In my cohort was [Dylan Tran](https://www.linkedin.com/in/susdt), or as we knew him, Sloppy Gerald. Dylan was a malware developer, avid red teamer, and chicken broth enthusiast who was highly accomplished in the [CPTC](https://cp.tc/) and [CCDC](https://www.nationalccdc.org/) competitions, even being named champion a couple of times (which is seriously no small feat). He encouraged me to try out the CRTO near the time when we completed a riveting netpen bootcamp taught by legends [Shikata (James Rogers)](https://securityintelligence.com/author/shikata/) and [Choi](https://www.linkedin.com/in/sunggwan-choi), which covered Active Directory attacks (most of which I was already familiar with through previous HTB/THM experience) and Certificate Services (which was completely new to me).

The bootcamp left me captivated and hungry for more advanced AD exploitation. When I learned that RTO taught certificate services attacks, delegation attacks, malware evasion, and so much more, I signed up immediately. Over the next two weeks, I was completely occupied by the training, which I juggled with internship stuff like bootcamps, projects, and shadows.

Despite not eating, drinking, or sleeping on some days, I somehow managed to take notes, read through the entire courseware, and complete all the attacks on the lab in around 12-14 days, which was half the time I had originally planned to take. When I finished the course, my exam was about 15 days away, and thus, the excruciating wait began consisting of material review and anticipation, but mainly anticipation. Funnily enough, one day at work, Dylan strolled over to my desk and joked, "you should take it right now lol." I looked at him like he was crazy and said, "what the hell, exam rescheduled!" 

## The Exam

That day at 6 pm, my exam began. I started by setting up my Cobalt Strike team server as a service so I wasted as few of the 48 hours provided to me on setup (which ended up being too much time anyway). Once everything was configured, I started my listeners and conducted the necessary modifications for my payloads not to be caught by Defender/AMSI.

After that, I opened an RDP session on the starting workstation (the exam is an assumed breach, so you get access to one low-priv machine) and executed my beacon. I did have to do some initial troubleshooting and privilege escalation, but soon enough, I was on my way. Initially, I thought I would be spending the whole night on the exam, and it was a Friday, so I thought an all-nighter wasn't too big of an issue. But within 3 hours, I compromised the first domain and got 3 of the 6 flags needed to pass the exam.

At this point, it was 9 pm, and the office was getting kind of sketchy, so I hurried home, broke my fast, prayed the sunset prayer, downed a root beer, and got right back to it. Within the next 3 hours, I compromised the 2nd domain and submitted all 6 flags, which gave me enough to pass the exam and be granted the coveted [CRTO badge](https://eu.badgr.com/public/badges/Od2nC1yPRPaDC9UCJ8W7Lg).

Check out the beacon chain I had by the end! It was an insane 9-machine P2P beacon chain all relying on a single egress beacon. Needless to say, I was in a weird state being full of adrenaline due to my "house of cards," but also annoyed since callbacks were snail-paced. I ended the day when I passed.

<img src="/assets/img/posts/beacon_chain.png" width="1100">

## Aftermath

The next day, I attempted to get the 2 remaining flags but accidentally fell asleep without stopping the exam environment. When I woke up, I discovered that I had used up all my remaining time (lol, bummer). But a win is a win, and I took it gladly.

In my humble opinion, the exam was definitely challenging in that it required some savvy thinking and problem-solving, but it was certainly not difficult to the point of stress and anxiety (clears throat, OSCP). During my preparation, Dylan kept telling me to relax since I was always worried that the AV evasion would be too hard and I would fail because of it. But the exam really was doable and frankly quite enjoyable.

Bottom line, if you pay attention to the course material and are able to replicate all the attacks in the lab environment, you will ace the exam no problem. So if you're on the edge, don't sweat it and take a shot at this cert.

# Future Plans

Overall, I felt that I needed a win in my security career since I got my [first CVEs](https://shehzade.io/cve) from [last summer's research](https://labs.withsecure.com/publications/megafeis-palm--exploiting-vulnerabilities-to-open-bluetooth-smar) at WithSecure, and CRTO was the perfect confidence booster to get me all fired up for offensive security again.

My post-CRTO plan was to immediately jump on CRTO II, which has been highly regarded as the perfect sequel into advanced red teaming (infrastructure stuff) and malware development (EDR evasion). However, we are currently in the middle of doing our internship research projects, so I don't think I'll be able to power through CRTO II with speed and dedication like I did with CRTO I since the second iteration of the course, as I've heard, is definitely **NOT** self-contained and requires extensive research and self-learning from external resources to be successful on the exam.

I think I'll hop off the certification train for now and try to produce the most badass project I can for XFR and hope they like it enough to call me back with a full-time offer at the end of the internship!
