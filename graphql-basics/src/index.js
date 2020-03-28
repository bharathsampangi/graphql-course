import { GraphQLServer } from "graphql-yoga";
import uuidv4 from "uuid/v4";

//Scalar types - String, Boolean, Int, Float, ID

//Demo user data
let users = [{
    id: '1',
    name: 'Bharath',
    email: 'bharath@ex.com',
    age: 24
}, {
    id: '2',
    name: 'Sara',
    email: 'sara@gmail.com'
}, {
    id: '3',
    name: 'Mike',
    email: 'mike@gmail.com'
}]

let posts = [{
    id: '11',
    title: 'First Post',
    body: 'body of first post',
    published: true,
    author: '1'
},
{
    id: '12',
    title: 'Some Post',
    body: 'body of some post',
    published: true,
    author: '1'
},
{
    id: '13',
    title: 'Another Post',
    body: 'body of another post',
    published: false,
    author: '2'
}]

let comments = [
    {
        id: 'C1',
        text: 'nice post there',
        author: '3',
        post: '11'
    },
    {
        id: 'C2',
        text: 'well done',
        author: '1',
        post: '11'
    },
    {
        id: 'C3',
        text: 'Could have been better',
        author: '2',
        post: '12'
    },
    {
        id: 'C4',
        text: 'Waiting for your next post',
        author: '1',
        post: '13'
    }
]

//Type definitions (schema)
const typeDefs = `
    type Query {
        posts(query: String): [Post!]!
        users(query: String): [User!]!
        me: User!
        post: Post!
        comments: [Comment!]!
    }

    type Mutation {
        createUser(name: String!, email: String!, age: Int): User!
        deleteUser(id: ID!): User!
        createPost(title: String!, body: String!, published: Boolean!, author: ID!): Post!
        deletePost(id:ID!): Post!
        createComment(text: String!, author: ID!, post: ID!): Comment!
        deleteComment(id: ID!): Comment!
    }

    type User {
        id: ID!
        name: String!
        email: String!
        age: Int
        posts: [Post!]!
        comments: [Comment!]!
    }

    type Post {
        id: ID!
        title: String!
        body: String!
        published: Boolean!
        author: User!
        comments: [Comment!]!
    }

    type Comment {
        id: ID!
        text: String!
        author: User!
        post: Post!
    }

`

//Resolvers
const resolvers = {
    Query: {
        comments() {
            return comments
        },
        posts(parent, args, ctx, info) {
            if (!args.query) {
                return posts;
            }

            return posts.filter((post) => {
                return (post.title.toLowerCase().includes(args.query.toLowerCase()) || post.body.toLowerCase().includes(args.query.toLowerCase()))
            })
        },
        users(parent, args, ctx, info) {
            if (!args.query) {
                return users
            }

            return users.filter((user) => user.name.toLowerCase().includes(args.query.toLowerCase()))
        },
        me() {
            return {
                id: '121212',
                name: 'Mike',
                email: 'mike@example.com'
            }
        },
        post() {
            return {
                id: 'F12121212',
                title: "Hi there",
                body: "How you doing!",
                published: true
            }
        }
    },
    Mutation: {
        createUser(parent, args, ctx, info) {
            const emailTaken = users.some(user => user.email === args.email)
            if (emailTaken) {
                throw new Error('Email taken.')
            }

            const user = {
                id: uuidv4(),
                name: args.name,
                email: args.email,
                age: args.age
            }

            users.push(user)

            return user;
        },
        deleteUser(parent, args, ctx, info) {
            const userIndex = users.findIndex((user) => user.id === args.id);
            if (userIndex === -1) {
                throw new Error('User not found!')
            }

            const deletedUsers = users.splice(userIndex, 1)

            posts = posts.filter((post) => {
                const match = post.author === args.id
                if (match) {
                    comments = comments.filter(comment => comment.post !== post.id)
                }

                return !match;
            })
            comments = comments.filter(comment => comment.author !== args.id)

            return deletedUsers[0]
        },
        createPost(parent, args, ctx, info) {
            const userExists = users.some((user) => user.id === args.author)
            if (!userExists) {
                throw new Error('User not found');
            }

            const post = {
                id: uuidv4(),
                title: args.title,
                body: args.body,
                published: args.published,
                author: args.author
            }

            posts.push(post);

            return post;
        },
        deletePost(parent, args, ctx, info) {
            const postIndex = posts.findIndex(post => post.id === args.id)

            if (postIndex === -1) {
                throw new Error("Post not found.")
            }

            const deletedPosts = posts.splice(postIndex, 1)
            comments = comments.filter(comment => comment.post !== args.id)

            return deletedPosts[0]
        },
        createComment(parent, args, ctx, info) {
            const userExists = users.some(user => user.id === args.author)
            if (!userExists) {
                throw new Error('User not found')
            }
            const postExists = posts.some(post => {
                let idExists = post.id === args.post
                let isPublished = post.published === true
                return idExists && isPublished
            });
            if (!postExists) {
                throw new Error('Post not found or not publised');
            }

            const comment = {
                id: uuidv4(),
                text: args.text,
                author: args.author,
                post: args.post
            }

            comments.push(comment)

            return comment
        },
        deleteComment(parent, args, ctx, info) {
            const commentIndex = comments.findIndex((comment) => {
                return comment.id === args.id
            })
            const deletedComments = comments.splice(commentIndex, 1);

            return deletedComments[0];
        }
    },
    Post: {
        author(parent, args, ctx, info) {
            return users.find((user) => {
                return user.id === parent.author
            })
        },
        comments(parent, args, ctx, info) {
            return comments.filter(comment => parent.id === comment.post)
        }
    },
    User: {
        posts(parent, args, ctx, info) {
            return posts.filter((post) => {
                return post.author === parent.id
            })
        },
        comments(parent, args, ctx, info) {
            return comments.filter((comment) => parent.id === comment.author)
        }
    },
    Comment: {
        author(parent, args, ctx, info) {
            return users.find(user => parent.author === user.id)
        },
        post(parent, args, ctx, info) {
            return posts.find(post => parent.post === post.id)
        }
    }
}

const server = new GraphQLServer({
    typeDefs: typeDefs,
    resolvers: resolvers
});

server.start(() => {
    console.log('The server is up!')
})