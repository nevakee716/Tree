| **Name** | **Filter By Contextual Association** | **Version** | 1.0 |
| --- | --- | --- | --- |
| **Updated by** | Mathias PFAUWADEL |

## Description 
Allow you to filter items on a node depending on a Contextual association with the first parent

## Installation
https://github.com/casewise/cpm/wiki

## Parameter setup 

DisplayName : Set the layout javascript class name you want to use to display this node
Filter In : Set the id of the node which should be display if the Contextual association exist
Filter Out : Set the id of the node which should be display if the Contextual association not exist

## How to set association filter
### Exemple 1
Here with have the following metamodel
country associated with organisation
organisation associated with sites
country associated with sites

We want to display the following list :
- country
	- organisation
		- sites
If we use the classic list, we would obtain this

![](https://github.com/nevakee716/FilterByContextualAssociation/blob/master/screen/1.png) 

Here we can see a problem, cause S&E Europe contains cities from Belgium and France, so we have french cities under Belgium 

To solve this situation, we need to use the layout filter by contextual Association, like this : 
![](https://github.com/nevakee716/FilterByContextualAssociation/blob/master/screen/3.png)
and here is the result

![](https://github.com/nevakee716/FilterByContextualAssociation/blob/master/screen/2.png)

### Exemple 2
Here with have the following metamodel
Sites associated with MacroProcess
MacroProcess with ProcessLvl2
ProcessLvl2 associated with MicroProcess
We also have Sites associated with MicroProcess

We want to display
- Sites
	- MacroProcess
		- ProcessLvl2
			- MicroProcess
And like exemple 1, some Microprocess are not present in some Sites. 
By configuring Filter By Contextual Association like this : 
We can display the MicroProcess that are present in the site and the ones not present in the site.
Using custom display string, we can apply the style we want to our present and not present MicroProcess

