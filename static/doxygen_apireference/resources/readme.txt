Getting Started

1. Install Doxygen

To run the test project: 

1. Open Doxygen.
2. Load Doxyfile_for_T4.doxy
3. Choose Run. 

What just happened? The output was created two levels up under docs/apireference/html. The default config looks at all of T4 and the output has no configurations. Not likely what you want. 

Process going forward: 

1. Decide what the goal is: Only doc public functions? Only create a version for Microsoft? 
2. Use the Doxywizard to modify what get analyzed and output. It's self explanatory. 
3. Set a different and logically named destination directory under /docs/. For example: /docs/M1_microsoft/
4. Save your custom doxyfile in the source/apireference directoy. 

You'll likely need multiple output dirs for different audiences and uses. 







