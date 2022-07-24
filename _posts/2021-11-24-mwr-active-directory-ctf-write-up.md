---
title: MWR Active Directory CTF Write-Up
date: 2021-11-24
layout: post
tags: ctf-writeup active-directory netsec
---

# What's MWR A.D Net?

The MWR corporate domain challenge was designed to allow penetration testers to showcase their Active Directory and Windows hacking skills. It involved gaining a foothold on the network, escalating local privileges, then escalating domain privileges, and finally taking over the entire forest. 

A quick summary of how I hacked this network begins with finding an Apache Tomcat server with default credentials. After gaining code execution by deploying a malicious ```.war``` file, I noticed that the ```SeImpersonate``` privilege was enabled. I used the popular Juicy Potato exploit to escalate privileges and become ```NT AUTH / SYSTEM```. Once I became a privileged user, I used an ingestor to collect information about the domain and ran Bloodhound to find ways to escalate privileges on the network.  

After some analysis, I found that a Domain Administrator named George Smith had a session (with left over credentials) on my comprised machine. This prompted me to use MimiKatz to extract his hashes and launch an elevated command prompt. I then ran a ```psexec``` command on that elevated prompt to execute a malicious reverse shell on the domain controller and gained full access to the domain as an administrator. 

I performed the same intelligence gathering techniques using ingestors and Bloodhound on the domain controller and discovered that ```uk.mwr.com``` (child domain) and ```mwr.com``` (parent domain) had a bi-directional trust. I took advantage of this by using a new account I had created and added to the "Domain Admins" group to login to the enterprise domain controller through SSH. A highly detailed technical write-up follows below. 

## Step 1 – Find the Apache Tomcat Server 

The first task in our journey to enterprise administrator was to gain a foothold on the network. Since the existence of a Tomcat server was already confirmed in the reconnaissance phase, it meant we didn’t have to flood the network with scanning traffic and alert all the security teams to our presence. A simple google search yielded the default port that Apache Tomcat runs at.

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.003.png)

Armed with this information, I scanned the entire network only for machines that have port 8080 open using a popular network scanning tool called Nmap.  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.004.png)

This scan returned output for every single host, but what interested me was this snippet. It showed that port 8080 was open on a machine with the IP address of ```192.168.22.150```. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.005.png)

After learning of the IP address, I navigated to ```http://192.168.22.150:8080/``` on my browser to confirm that what I found was infact a Tomcat server. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.006.jpeg)

## Step 2 – Gain Access to the Manager Interface  

For some background, Tomcat servers provide a "pure Java" HTTP web server environment in which Java code can run. To manage the applications, it has a built-in administrative interface located in the ```/manager/html``` web directory. Access to this interface allows us to deploy special files which can give us a shell on this machine, however, it is protected by HTTP BASIC authentication.  

Logically, the next step was to try and brute force the credentials with some common username and password pairs. Lists for Tomcat default credentials have already been compiled and can be found in Metasploit’s program files at the path ```/usr/share/metasploit-framework/data/wordlists/tomcat_mgr_default_*.txt```. 

To perform the actual brute force, I decided to use a [program I had written myself](https://github.com/shehzade/brutus) as part of a [Python course](https://academy.tcm-sec.com/p/python-101-for-hackers). I began by cloning the repository into my working directory. This was performed as shown. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.007.png)

Once I had the script, I executed it with the following arguments. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.008.png)

The script ran and returned valid credentials once they had been found. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.009.jpeg)

Now that valid credentials were in my possession, I attempted to login to the manager interface as shown.  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.010.jpeg)

Authentication was successful and I was given full access to deploy and undeploy applications as I wished. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.011.jpeg)

## Step 3 – Gain Shell Access to the Tomcat Server 

Getting code execution on the server through the manager interface of Apache Tomcat was quite simple. First, I created the appropriate payload with suitable parameters using a shellcode generation tool called MSF Venom.

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.012.png)

Once I had a malicious ```.war``` file (the kind that Tomcat can run), I uploaded it to the manager interface and deployed it. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.013.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.014.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.015.png)

Now that my malicious ```.war``` file was deployed, I could move on to execution. But before that, I opened a listener on my machine to catch the shell that would be returned to me by the Tomcat server. I used a network utility called Netcat wrapped in the ```rlwrap``` command which would provide shell history and auto-completion features (often unavailable in non-interactive shells).  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.016.png)

Now that my machine was listening for a shell on the same port that was configured in my payload earlier, it was time to execute. I simply navigated to my shell and clicked on it as shown. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.017.png)

In a couple of moments, I received my shell. The shell’s privileges, IP address, and hostname are also displayed. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.018.png)

To find out what privileges Apache Tomcat was running with, I ran the ```tasklist``` command with the ```/v``` flag to show all running tasks and their owners. I then piped the output to a searching program called ```findstr``` so I could view only the information associated with Tomcat. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.019.png)

## Step 4 – Escalate Local Privileges

The next step was the escalation of privilege. Since I only had the privileges of ```LOCAL SERVICE```, I needed to abuse some misconfiguration and gain ```SYSTEM``` privileges to perform more effective intelligence gathering on the domain. The first check I ran to identify misconfigurations was establishing the state of the ```SeImpersonate``` privilege since that is a common and easy vector of privilege escalation. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.020.png)

Once I learned that it was enabled, I began preparations to transfer and execute the Juicy Potato exploit. [Juicy Potato](https://github.com/ohpe/juicy-potato/releases) is a local privilege escalation tool created by Andrea Pierini and Giuseppe Trotta to exploit Windows service accounts’ impersonation privileges. The tool takes advantage of ```ImpersonatePrivilege``` to elevate the local privileges to ```SYSTEM```. Normally, these privileges are assigned to service users, admins, and local systems — high integrity elevated users.  

The first step to escalate privileges was to create a folder where I can keep all the transferred binaries and tools to make clean up easier. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.021.png)

After creating my folder on the target, I navigated to the Juicy Potato binary on my machine and hosted it through a simple Python web server. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.022.png)

I then returned to the Windows target and abused a [native Windows binary](https://lolbas-project.github.io/lolbas/Binaries/Certutil/) used for managing certificates to download the exploit from my web server. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.023.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.024.png)

When I execute the exploit, it will run any binary I assign with ```SYSTEM``` privileges. So, before execution, I created a malicious binary using the same MSF Venom tool displayed earlier. I then transferred it to the target by hosting it on a light Python HTTP server and abusing the same Windows binary to download it once again. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.025.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.026.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.027.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.028.png)

After all the important files were on the target, I opened a listener on my machine to catch the new shell which would be sent by my malicious binary (executed as ```SYSTEM```).  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.029.png)

I then proceeded to execute the exploit with the following command. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.030.png)

The exploit indicated success and when I returned to check my listener, I found that a shell with ```SYSTEM``` privileges had been returned. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.031.png)

I navigated to the ``C:\`` drive and printed the contents of the flag.

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.032.jpeg)

## Step 5 – Compromise the Domain Controller 

Before attacking the domain controller, I wanted to learn more about how the domain is structured and which accounts have what privileges on which machines. This visualization and mapping is done with a tool called Bloodhound. While Bloodhound can visualize the domain, it uses data collected by extended tooling called ingestors.  

Ingestors like ```SharpHound.exe``` are portable executables that collect the actual data which Bloodhound uses to create those visualizations and maps. Since that data must be exfiltrated from the machine, I transferred in the ingestor as well as the Netcat tool to provide this functionality.  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.033.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.034.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.035.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.036.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.037.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.038.png)

Now that I had my tools on the target, I executed the ingestor which scoured the machine and its domain for information and packaged it into a neat zip file that could be imported into Bloodhound to create the map. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.039.png)

After a couple of seconds, I noticed a new zip file in my directory listing.  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.040.jpeg)

This is the file that I needed to exfiltrate to my machine, and I used Netcat to achieve this. First, I opened a listener on my machine, then I connected to that listener from the target making sure to include the zip file in the transfer. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.041.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.042.png)

After a couple of minutes, I terminated the connection and found the zip file on my machine. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.043.png)

I had everything I needed to map the domain. It was now time to [begin launching Bloodhound](https://www.ired.team/offensive-security-experiments/active-directory-kerberos-abuse/abusing-active-directory-with-bloodhound-on-kali-linux). Bloodhound uses ```neo4j``` to store data, so that was initialized as well.

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.044.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.045.png)

Once Bloodhound was up and running, it was time to begin importing the data that was collected from the target. This was performed as shown below. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.046.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.047.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.048.png)

After the data was imported, I marked the Tomcat server as "Owned" and instructed Bloodhound to map the shortest path from where I was right now, to the domain controller. The results returned are shown below. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.049.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.050.jpeg)

This map indicated that there was a user called ```George.Smith.Adm``` who had a session to the machine I compromised. George was also a member of the "Domain Admins" group who had full access to the domain controller, and thus, immediately became my target. Because I had ```SYSTEM``` privileges on the machine, I could extract his credentials using a tool called MimiKatz. I hosted MimiKatz on my HTTP server and downloaded it to the target.  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.051.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.052.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.053.jpeg)

After moving MimiKatz to the target, I executed it and dropped into its own shell. I then proceeded to escalate my privileges using the ```privilege::debug``` command because the credentials I needed were stored in a sensitive part of memory. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.054.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.055.png)

Now that my debug privileges were approved, I dumped all the logon passwords using the command ```sekurlsa::logonpasswords```. The first entry I received was exactly what I was looking for. An important note for this step was that even though George’s correct plaintext credentials were visible in the "Kerberos" section, they were not working and threw some odd network errors. I decided to proceed with his NTLM hashes instead since it was only a matter of time before I was detected. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.056.jpeg)

Since I was conducting the attack with his hashes, I decided to perform a pass-the-hash attack. I opened a new listener on my machine and used MimiKatz to re-execute my old reverse shell binary (used during local privilege escalation) with the token of the George Smith user. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.057.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.058.jpeg)

After a moment or so, I received a new shell. It is important to understand that even though the shell is running with ```NT AUTH / SYSTEM``` privileges (which we already had), it is also running with the token of the George Smith user. This means that any action I perform (like ```psexec```) in this new shell will be executed in the context of George Smith (who is a domain admin with rights to the domain controller).  

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.059.png)

At this point, I had a shell as George Smith on the Tomcat server, however, I wanted to get a remote session on the domain controller. One way to do this was by running ```psexec``` to launch a remote management session. Since it wasn’t available natively, I downloaded it, and transferred it to the machine. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.060.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.061.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.062.png)

Once ```psexec``` was available to me, I needed a one-line reverse shell command which I could use on the domain controller to get a remote session. I created one using a [shell generation web site](https://www.revshells.com/).

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.063.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.064.jpeg)

Now that I had my reverse shell command as a condensed and encoded one-liner, I opened yet another listener on my machine, and executed my payload on the domain controller with the permissions of George Smith through the ```psexec``` command. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.065.jpeg)

I received a shell on the domain controller after a couple of seconds as the George Smith user and captured the flag located in the ```C:\``` drive. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.066.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.067.jpeg)

## Step 6 – Become Enterprise Administrator 

After getting a shell on the domain controller, I had to reperform all the steps that were conducted on the Tomcat server. Since the domain controller can see things the Tomcat server cannot, I re-transferred Netcat and the ingestor onto the domain controller. The transfer of tools is shown below. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.068.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.069.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.070.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.071.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.072.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.073.png)

I also created a new user called ```hacker``` and added him to the "Domain Admins" group so that in the event of my shells dying, I could just login. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.074.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.075.png)

Once my tools were on the domain controller and my new back up user was created, I executed the ingestor, and exfiltrated the new zip file back to my machine for analysis with Bloodhound. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.076.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.077.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.078.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.079.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.080.png)

After successful exfiltration, I cleared the Bloodhound database and imported the new domain intelligence. This is shown below. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.081.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.082.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.083.jpeg)

Keeping in mind that becoming "Enterprise Administrator" was my goal, I instructed Bloodhound to map the trust that existed between ```uk.mwr.com``` and ```mwr.com```. The query and its result are displayed. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.084.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.085.png)

The new map indicated a bi-directional trust meaning that Domain Admins on the UK domain might have privileges on the MWR enterprise. I decided to test the extent of this privilege, but first, I had to find where the enterprise domain controller was located. To accomplish this, I established an RDP session to the ```uk.mwr.com``` domain controller and queried its DNS service. 

My thinking was that if ```dc2-2012.uk.mwr.com``` is a child domain controller in the forest, then its default DNS server would have to be ```dc1-2012.mwr.com``` (the parent domain controller). The establishment of the RDP session as well as the DNS queries and responses are shown below. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.086.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.087.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.088.png)

The DNS service exposed the IP address of the enterprise domain controller as ```192.168.22.100```. After scanning that IP address, I found SSH to be open, so I decided to test my privileges there. I attempted to login with the new user I had created and made a Domain Admin in the child domain (```uk.mwr.com```). My results are shown below. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.089.png)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.090.png)

## Step 7 – Clean Up 

After compromising the entire network, it was critical to delete all foreign artifacts and leave the network just as I had originally found it. With the access I had to the domain controller, I reopened shells on all the machines I had touched and removed the "escalation" folders that I created to store my tools and other necessary files. I also deleted the ```hacker``` user from the network entirely. 

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.091.jpeg)

![](/assets/img/posts/Aspose.Words.35d10e5b-bf73-47cf-8800-840a45bee698.092.jpeg)

# Overview

I have to say, since this CTF was timed, it was definitley nerve wrecking. But I'm glad I got to use the skills I learned from [TCM's penetration testing course](https://academy.tcm-sec.com/p/practical-ethical-hacking-the-complete-course) and practiced on my home lab to break into and pwn a corporate-style network. Now, I do understand that this was made pretty easy with no AV or EDR, but one step at a time right?
