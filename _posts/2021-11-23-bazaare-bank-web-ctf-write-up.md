---
title: Bazaare Bank Web CTF Write-Up
date: 2021-11-23
layout: post
tags: ctf-writeup web appsec
---

# What's Bazaare Bank?

Bazaare Bank is a vulnerable web application designed to assess a penetration testers ability to find and exploit a variety of commonly found web application vulnerabilities. Since the exercise was task-based rather than goal-based, this in-depth technical write-up will describe how I achieved each objective and what steps I took in my approach. 

Overall, I documented vulnerabilities such as information disclosure, structured query language (SQL) injection, cross-site scripting (XSS), arbitrarily file upload, directory path traversal, XML entity injection, and insecure JSON web tokens.  

**Note:** Some of the screenshots came out quite blurry for some reason but they're all readable so apologies in advance!

## Task: 1 – Hungry For Cookies 

The first task in this challenge was to find information that web developers might be storing in easily accessible cookies. Often, developers believe that users will not know or care about this information, however, they are not accounting for malicious users. When I first connected to the network, I visited the Bazaare Bank website on my browser. I was presented with the following page. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.003.jpeg)

To view the locally stored cookies on my web browser, I simply right-clicked, selected "Inspect Element," navigated to the "Storage" tab, and exposed the site’s cookies. The steps are shown below.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.004.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.005.png)

After retrieving the encoded flag, I passed it to the base64 program to decode it and ended up with the value ```secrets-are-meant-to-be-told```.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.006.png)

## Task: 2 – Hunting for Test Data 

Developers often leave sensitive information in the comments of their source code. Just like cookies, they don’t realize how easy it is to retrieve. This task focused on extracting test credentials from the website’s source files. 

To collect and organize the website’s files, I decided to use a web proxy called Burp Suite. After launching the tool, I used a Firefox extension called Foxy Proxy to easily redirect traffic to the port that Burp Suite was listening on. Once I had traffic going through my proxy, I set a filter instructing Burp Suite to only collect traffic going to and coming from ```http://192.168.22.100/``` to minimize noise and useless requests.  

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.007.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.008.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.009.jpeg)

After clicking around a bit and allowing Burp Suite to build an accurate site map, I began skimming over the source code of interesting pages. One such page was the login portal. After scrolling through it, I came across an HTTP comment exposing credentials for a user called ```test```. They are shown below. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.010.jpeg)

Attempting to authenticate to the application with ```test:Testing123!``` yielded success. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.011.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.012.png)

## Task: 3 – Find a Millionaire

The objective of this task was to test the access control mechanisms of the application and find an account holder with a balance over £1,000,000. After exploring the pages available to me as an authenticated user, I landed on an "Account Details" page by clicking "Bank > Accounts > [Specific Account]."  

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.013.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.014.jpeg)

Looking at the URL in the browser as well as in the proxy, I noticed that there was a parameter called ```id``` being passed which was most likely referencing which account to pull data for.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.015.jpeg)

I sent this request from the main HTTP history tab in Burp Suite to a tool called Burp Repeater (in the same application) by right clicking on the request and selecting "Repeater."  

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.016.jpeg)

Burp Repeater is a simple tool for manually manipulating and re-issuing individual HTTP/WebSocket messages and analyzing the application's responses. Once I had the interesting request loaded into Repeater, I decided to change the ```id``` parameter to a random number and see what it would return. The results are shown below. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.017.jpeg)

It appeared that I could retrieve any customer’s account information simply by changing the value I passed to the ```id``` parameter. To find which ID number referenced an account with a balance of over a million pounds, I had three options. I could either use Burp’s Intruder tool, ZAP’s web fuzzer, or write my own script in Python. Burp’s Intruder tool is extremely limited in the free community edition, so I ruled it out. ZAP’s web fuzzer provides the ability to iterate through the ID numbers, but makes it impossible to search for an account balance greater than a million pounds. By process of elimination, I ended up using Python.  

I began by analyzing the source code of the "Account Details" page. As shown below, it appeared that the account balance was stored in an HTML ```label``` tag with the attribute of ```id="accountBalance"``` while the account number was stored in another ```label``` tag with the attribute of ```id="accountNumber"```.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.018.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.019.png)

Since the page was so well organized, it would be easy to parse it and extract the data I needed using the BeautifulSoup Python library. The finished script and a quick summary describing its function are shown below.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.020.jpeg)

Before going over the script’s logic, it is important to note that Python was throwing some weird errors with this web site. The solution turned out to be adding headers which would accept the Great Britain version of English. 

Moving on to the logic, I began by importing the requests library to communicate with the web server and the BeautifulSoup library to parse the response into a searchable and sortable format. I then created a for-loop which would iterate over all the numbers (or IDs) from 1 to 101. For each iteration of the loop, it would make a GET request to the "Account Details" page with a new ID and store the output in the ```raw_html``` variable.

Then, BeautifulSoup would parse all the HTML and store it into the ```account_soup``` variable. After that, the balance data and account number for each ID would be retrieved by Beautiful Soup’s ```find``` function and stored in the ```balanceTag``` and ```accountTag``` variables. Finally, the loop would print the ID, account number, and balance to the terminal. Execution of the script and identification of the millionaire are shown below. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.021.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.022.png)

After taking a closer look at ID 88, I confirmed that the account’s balance was in fact, eight million British pounds. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.023.jpeg)

## Task: 4 – Make a Fraudulent Transaction

Now that we had identified a millionaire, it was to time to see if we could help ourselves to her fortune. My first approach was to understand how the "Make a Payment" functionality worked since that was the primary way of transferring funds. I began by taking the millionaire’s account number and sort code, and sending her one pound as a sample transaction. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.024.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.025.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.026.jpeg) ![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.027.png)

Once my payment was successfully completed, I visited Burp Suite to view what was happening behind the scenes.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.028.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.029.png)

Based on the request sent from my web browser to the server, it seemed that I could easily manipulate the ```SourceAccountId``` value as well as the ```RecipientAccountNumber``` and the ```RecipientAccountSortCode``` to make transfers to and from any account that I wanted. I decided to send the request to Burp’s Repeater and test out my theory.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.030.png)

Once the request was loaded into Repeater, I went back to retrieve my account number and sort code and proceeded to modify the transfer request so that it would send all the funds from the millionaire’s account (ID 88) into mine.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.031.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.032.jpeg)

Once I hit send, I received a message saying that my transaction was approved. Refreshing the page produced even more joyous results as well as the target flag.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.033.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.034.jpeg)

## Task: 5 – Exploit Stored XSS to Steal User Cookies

If access control was implemented, and cross-site scripting was a valid attack vector, the same fraudulent transaction performed in the previous task could be successfully completed by stealing other users’ authentication cookies. This is partially demonstrated in the following excercise.  

Since stealing another user’s cookies involved sending them a payment, I went back to take a closer look at the "Make a Payment" page. I noticed a field that had escaped my attention in the previous task. The "Transaction Reference" field was basically a note for the receiving party regarding the purpose of payment. What was even more interesting is that a simulated user on the other end was guaranteed to receive this note meaning their browser would surely render the message and execute any JavaScript sent along with it.  

I found some JavaScript code online that would make web requests when executed. To weaponize it, I modified it to make a POST request to me which would include the document cookie in the message body. Since it would be sent to me in only one request, Netcat was the perfect tool to receive it. I opened a listener, typed my payload, and submitted the payment. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.035.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.036.jpeg)

A quick note before continuing. As soon as I reached the confirmation page for the payment, I saw signs that my attack would work. This is because the application accepted my payload as JavaScript code and stopped rendering it.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.037.jpeg)![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.038.png)

A couple of moments later, the simulated user refreshed his page which executed the JavaScript payload delivering his cookie to my listener.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.039.jpeg)

## Task: 6 – Exploit SQLi to Retrieve April Rowland’s Credentials

After working with the ID parameter on the "Account Details" page, intuition made me certain that it was vulnerable to SQL injection. To test this, I ran an automated scanner called SQLMap and tested for SQLi. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.040.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.041.jpeg)

SQLMap found the parameter to be vulnerable, so I decided to proceed with my enumeration of the internal databases, tables, and columns. Of course, I began with databases. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.042.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.043.png)

Once I had a list of the available databases, I selected ```bankdb``` to enumerate further since that appeared the most relevant.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.044.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.045.png)

After finding the ```Users``` table, I knew that it must contain April’s password, so I dumped it out. Due to the gargantuan size of the table, I was able to view her credentials as they were slowly being retrieved.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.046.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.047.png)

## Task: 7 – Exploit Path Traversal to Read a Flag 

This task’s objective was to retrieve the contents of a local file by exploiting a path traversal vulnerability. A path traversal attack aims to access files and directories that are stored outside the web root folder. By manipulating variables that reference files with dot-dot-slash (../) characters, it is possible to access arbitrary files and directories stored on the file system. 

After exploring the "Account Details" page further, I noticed a "Generate Summary" button, so I clicked on it. It seemed to process my request but eventually popped up a selection prompt with options to view the report through a direct link or an "experimental" file manager. Since the file manager was more likely to be vulnerable to a path traversal vulnerability I decided to check it first.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.048.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.049.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.050.png)

Once on the viewing page, the URL immediately set off red flags. The ID parameter was calling a resource by using a path on the local system. I tested it to see if I could retrieve ```/etc/passwd``` by backtracking to the root directory and accessing the new file. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.051.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.052.jpeg)

After a successful retrieval, I simply replaced ```/etc/passwd``` with ```/etc/flag.txt``` and retrieved the intended flag.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.053.png)

## Task: 8 – Use arbitrary upload to achieve RCE 

Arbitrary file upload is especially dangerous because it almost always results in command execution on the application server. In this case, the functionality that could be abused was the credit card creation feature. During card creation, the system allowed the upload of an image to be the cover of the card. Unfortunately, there were absolutely no checks to make sure that the file was an image. This enabled me to upload a web shell and execute commands of my choosing on the web server.  

An important consideration when working with web shells is which type to use. Since web sites are usually written in specific programming languages, the app servers can only execute that type of code. For example, with a PHP site, I would use a PHP web shell, however, for a site hosted on Microsoft’s IIS web server, an ASPX/ASP web shell is required. The method I used to find out what language Bazaare Bank was written in was a browser extension called Wappalyzer. After installing the extension and clicking on it while in the Bazaare Bank application, it exposed the backend coding language.  

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.054.png)

Once I knew what language web shell I needed, I headed over to GitHub and found a [great web shell](https://github.com/tennc/webshell/blob/master/fuzzdb-webshell/jsp/cmd.jsp)  written by a community member in JSP. I cloned it to my machine and uploaded it as the cover of my new credit card. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.055.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.056.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.057.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.058.png)

After my card was created and my web shell uploaded, I needed to find out where the filr was located so that I could execute commands through it. To discover this, I went to the "Card Details" page and selected my new card. I then right clicked on what was supposed to be an image and found the path it was being sourced from.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.059.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.060.png)

At this point, everything was set. I had my web shell uploaded, I knew its location, and I could now proceed with command execution. To perform this, I used Burp to manually send a request to my web shell and retrieve the command's output.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.061.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.062.png)

Since my test was successful, I proceeded to execute the ```/bin/flag``` binary to retrieve the intended flag.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.063.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.064.png)

## Task: 9 – Retrieve a Text File Through XML Entity Injection

XML external entity injection is a web security vulnerability that allows an attacker to interfere with an application's processing of XML data. It often allows an attacker to view files on the application server's filesystem and interact with any back-end or external systems that the application server itself can access. 

Taking a closer look at the reporting functionality of the application led me to intercept the report requests between the browser and the server. I turned on Burp Suite’s interception feature and discovered that the method the application was using to retrieve reports was XML. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.065.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.066.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.067.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.068.jpeg)

Armed with this information, I proceeded to send the request to Repeater, and injected my own XML entity as well as a target file I wanted to view. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.069.jpeg)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.070.png)

The results of my test XML payload designed to retrieve the ```/etc/passwd``` file is shown below.

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.071.jpeg)

Once my XML entity was successfully being injected and called by the parser, I moved on to retrieve the target flag located at ```/etc/xxe-flag.txt```.  

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.072.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.073.jpeg)

## Task: 10 – Manipulate JSON Web Tokens to Impersonate Users 

The last challenge focused on manipulating insecure implementations of JSON web tokens to impersonate other users. JWTs are a text-based format for transmitting data across web applications. They store information in an easy-to-access manner, both for developers and computers. Logging out of Bazaare Bank and logging back in with the "Remember Me" box checked, prompted the server to add a third cookie in the browser (JWT).  

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.074.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.075.png)

Inserting this token into a [decoder](https://token.dev), yields the following results. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.076.jpeg)

There are three components to a JWT, a header, a payload, and a signature. To abuse some implementations of JWT that support the ```None``` algorithm, we can change the ```alg``` header to ```None``` (which will make the application consider the token to be signed), and the ```username``` option to our target user: ```jwt-user```. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.077.jpeg)

Once the new token was generated, I used Burp’s Repeater to insert the token and retrieve the home page as well as the accompanying flag. A note to keep in mind is that the token in the screenshot might be different due to repeated testing, however, the process to generate new tokens was identical. 

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.078.png)

![](/assets/img/posts/Aspose.Words.604234a4-aab4-45a6-93c4-cd435f36d0e0.079.png)

# Overview

This CTF was actually really fun. I got to test out some pretty cool vulns and hone my intuition for finding flaws in web applications. One thing I will say though is that pwning stuff and writing about is always a blast, but coming up with the remediations and the other parts of an official report are basically the lion's share of this job. I will certainly need to upskill my technical writing if I'm to succeed and as you'll see, I plan on doing that with more reports, CTF write-ups, and blog posts!
